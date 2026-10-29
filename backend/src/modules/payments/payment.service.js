// SERVICIO DE PAGOS (Stripe Checkout, modo test)
//
// Reglas:
//  - El saldo SOLO se acredita con confirmación verificada del servidor
//    (webhook firmado o /sync con la sesión consultada a Stripe).
//  - La acreditación es idempotente: PENDIENTE -> PAGADO con updateMany
//    condicional + Movimiento.pagoId @unique.
//  - Nunca se registra la clave secreta ni datos de tarjeta.

import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/ApiError.js';
import { prisma } from '../../shared/prisma.client.js';
import { toDecimal, toNumber } from '../../shared/utils/money.js';
import { acreditar } from '../../shared/utils/ledger.js';
import { userTransaction, currentTransaction } from '../../shared/transaction.js';
import { getStripe } from './stripe.client.js';
import * as repo from './payment.repository.js';

const EXPIRA_CHECKOUT = 31 * 60; // Stripe exige >= 30 min; 31 evita desfases de reloj

/** Bs con 2 decimales -> centavos enteros, sin floats. */
export function aCentavos(monto) {
  return toDecimal(monto).mul(100).toDecimalPlaces(0).toNumber();
}

function origenValido(origen) {
  if (typeof origen !== 'string') return null;
  try {
    const url = new URL(origen);
    return url.protocol === 'http:' || url.protocol === 'https:' ? origen.replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

/** Base de las success_url/cancel_url. Con CORS_ORIGINS='*' cae a localhost. */
export function baseUrl() {
  const configurada = origenValido(env.STRIPE_CHECKOUT_BASE_URL);
  if (configurada) return configurada;
  const primerOrigen = Array.isArray(env.corsOrigins) ? env.corsOrigins[0] : null;
  return origenValido(primerOrigen) ?? 'http://localhost:5173';
}

function dependencias(deps = {}) {
  return {
    prisma: deps.prisma ?? prisma,
    repo: deps.repo ?? repo,
    userTransaction: deps.userTransaction ?? userTransaction,
    acreditar: deps.acreditar ?? acreditar,
    getStripe: deps.getStripe ?? getStripe,
    ahora: deps.ahora ?? (() => Date.now()),
  };
}

/**
 * Crea Pago + Checkout Session dentro de la operación idempotente.
 * Si Stripe falla, la transacción revierte y la Operation no se persiste.
 */
export async function crearCheckout(userId, { monto }, deps = {}) {
  const { repo: repositorio, userTransaction: enTransaccion, getStripe: obtenerStripe, ahora } = dependencias(deps);
  const montoDec = toDecimal(monto);
  const centavos = aCentavos(monto);

  return enTransaccion(userId, async (tx) => {
    const pago = await repositorio.crearPago(tx, {
      userId,
      monto: montoDec,
      moneda: env.STRIPE_CURRENCY,
      stripeSessionId: `pendiente-${randomUUID()}`, // se reemplaza con el id real de Stripe
    });

    // Timeout corto y sin reintentos: la llamada ocurre con el lock de la
    // wallet tomado (timeout de Prisma 15 s). La operación es idempotente,
    // así que un reintento manual con la misma clave recupera el resultado.
    const session = await obtenerStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: 'es',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: centavos,
          product_data: {
            name: 'Recarga de saldo (simulación)',
            description: 'Pago de prueba: no se cobra dinero real',
          },
        },
      }],
      client_reference_id: userId,
      metadata: { pagoId: pago.id, userId },
      success_url: `${baseUrl()}/billetera/retorno?pago=${pago.id}`,
      cancel_url: `${baseUrl()}/billetera?pago=cancelado`,
      expires_at: Math.floor(ahora() / 1000) + EXPIRA_CHECKOUT,
    }, { idempotencyKey: currentTransaction()?.operationId ?? pago.id, maxNetworkRetries: 0, timeout: 5000 });

    await repositorio.actualizarSesion(tx, pago.id, session.id);

    return {
      pagoId: pago.id,
      checkoutUrl: session.url,
      expiraEn: new Date(session.expires_at * 1000).toISOString(),
    };
  });
}

/**
 * Confirmación idempotente. La llaman el webhook y /sync.
 * Devuelve { estado, acreditado, saldoActual? }.
 */
export async function confirmarPago(session, deps = {}) {
  const { prisma: db, repo: repositorio, userTransaction: enTransaccion, acreditar: acreditarSaldo } = dependencias(deps);

  let pago = await db.pago.findUnique({ where: { stripeSessionId: session.id } });
  // Respaldo: si el id de sesión no se persistió, se busca por metadata.
  if (!pago && session.metadata?.pagoId) {
    pago = await db.pago.findUnique({ where: { id: session.metadata.pagoId } });
  }
  if (!pago) return { estado: 'DESCONOCIDO', acreditado: false };

  // Validaciones de integridad: si no cuadran, no se acredita.
  const centavosEsperados = aCentavos(pago.monto);
  const importeOk = session.amount_total === centavosEsperados;
  const monedaOk = String(session.currency).toLowerCase() === pago.moneda.toLowerCase();
  const pagoIdOk = session.metadata?.pagoId === pago.id && session.client_reference_id === pago.userId;
  if (!importeOk || !monedaOk || !pagoIdOk) {
    console.error(JSON.stringify({ level: 'error', evento: 'stripe_mismatch', pagoId: pago.id }));
    return { estado: pago.estado, acreditado: false, motivo: 'MISMATCH' };
  }

  if (session.payment_status !== 'paid') return { estado: pago.estado, acreditado: false };
  if (pago.estado === 'PAGADO') return { estado: 'PAGADO', acreditado: false };

  return enTransaccion(pago.userId, async (tx) => {
    const cambio = await repositorio.marcarPagado(tx, pago.id, session.payment_intent ?? null);
    if (cambio.count === 0) {
      // Otro proceso (webhook o /sync) ya lo acreditó.
      const actual = await repositorio.buscarPorId(tx, pago.id);
      return { estado: actual?.estado ?? 'DESCONOCIDO', acreditado: false };
    }
    const saldo = await acreditarSaldo(
      tx, pago.userId, pago.monto, null,
      'Recarga con Stripe (modo test)', 'DEPOSITO', { pagoId: pago.id },
    );
    return { estado: 'PAGADO', acreditado: true, saldoActual: toNumber(saldo) };
  });
}

export async function consultarPago(userId, pagoId, deps = {}) {
  const { prisma: db } = dependencias(deps);
  const pago = await db.pago.findFirst({ where: { id: pagoId, userId } });
  if (!pago) throw new ApiError(404, 'Pago no encontrado'); // 404 genérico: no revela pagos ajenos
  return {
    pagoId: pago.id,
    estado: pago.estado,
    monto: toNumber(pago.monto),
    moneda: pago.moneda,
    creadoEn: pago.creadoEn,
    pagadoEn: pago.pagadoEn,
  };
}

export async function sincronizarPago(userId, pagoId, deps = {}) {
  const { prisma: db, getStripe: obtenerStripe } = dependencias(deps);
  const pago = await db.pago.findFirst({ where: { id: pagoId, userId } });
  if (!pago) throw new ApiError(404, 'Pago no encontrado');
  if (pago.estado !== 'PENDIENTE') return consultarPago(userId, pagoId, deps);

  const session = await obtenerStripe().checkout.sessions.retrieve(pago.stripeSessionId);
  await confirmarPago(session, deps);
  return consultarPago(userId, pagoId, deps);
}

/** Webhook: traduce el evento a confirmarPago; nunca acredita por sí mismo. */
export async function procesarEvento(event, deps = {}) {
  const { prisma: db, repo: repositorio, userTransaction: enTransaccion } = dependencias(deps);
  const { type, data } = event;

  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    return confirmarPago(data.object, deps);
  }
  if (type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') {
    const pago = await db.pago.findUnique({ where: { stripeSessionId: data.object.id } });
    if (pago && pago.estado === 'PENDIENTE') {
      await enTransaccion(pago.userId, (tx) =>
        repositorio.marcarFallido(tx, pago.id, type === 'checkout.session.expired' ? 'EXPIRADO' : 'FALLIDO'));
    }
    return { estado: 'SIN_CAMBIO', acreditado: false };
  }
  return { estado: 'IGNORADO', acreditado: false };
}
