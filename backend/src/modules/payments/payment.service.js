// SERVICIO DE PAGOS (Stripe Checkout, modo test)
//
// Reglas:
//  - El saldo SOLO se acredita con confirmación verificada del servidor
//    (webhook firmado o /sync con la sesión consultada a Stripe).
//  - La acreditación es idempotente: PENDIENTE -> PAGADO con updateMany
//    condicional + Movimiento.pagoId @unique.
//  - Nunca se registra la clave secreta ni datos de tarjeta.
//  - Llamadas a Stripe fuera de transacciones; idempotencia por operación.

import { env } from '../../config/env.js';
import { ApiError } from '../../shared/ApiError.js';
import { prisma } from '../../shared/prisma.client.js';
import { toDecimal, toNumber } from '../../shared/utils/money.js';
import { acreditar } from '../../shared/utils/ledger.js';
import { userTransaction } from '../../shared/transaction.js';
import { getStripe } from './stripe.client.js';
import * as repo from './payment.repository.js';
import { canonical } from '../../shared/operations.js';
import { createHash } from 'node:crypto';

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

function construirParametrosStripe({ pagoId, montoDec, centavos, userId, ahora }) {
  const base = baseUrl();
  return {
    mode: 'payment',
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
    metadata: { pagoId, userId },
    success_url: `${base}/billetera/retorno?pago=${pagoId}`,
    cancel_url: `${base}/billetera?pago=cancelado`,
    expires_at: Math.floor(ahora() / 1000) + EXPIRA_CHECKOUT,
  };
}

/**
 * Crea/reutiliza checkout con operación idempotente, fuera de transacción para llamada a Stripe.
 */
export async function crearCheckout(userId, { monto }, deps = {}, opts = {}) {
  const { prisma: db, repo: repositorio, userTransaction: enTransaccion, getStripe: obtenerStripe, ahora } = dependencias(deps);
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, 'Pagos no configurados', undefined, 'PAYMENTS_NOT_CONFIGURED');
  }
  const montoDec = toDecimal(monto);
  const centavos = aCentavos(monto);
  const key = opts.idempotencyKey;
  if (!key) throw new ApiError(400, 'Idempotency-Key es obligatorio', undefined, 'IDEMPOTENCY_KEY_REQUIRED');
  const fingerprint = createHash('sha256').update(JSON.stringify(canonical({ operation: 'payments_checkout', payload: { monto: montoDec.toString() } }))).digest('hex');

  // Transacción corta 1
  const fase1 = await enTransaccion(userId, async (tx) => {
    const previousOp = await tx.operation.findUnique({ where: { userId_key: { userId, key } } });
    if (previousOp) {
      if (previousOp.fingerprint !== fingerprint) {
        throw new ApiError(409, 'La clave ya corresponde a otra solicitud', undefined, 'IDEMPOTENCY_CONFLICT');
      }
      // Si ya existe operación terminada, reproducir
      if (previousOp.status >= 200 && previousOp.status < 300 && previousOp.status !== 202) {
        return { tipo: 'REPLAY_OK', op: previousOp, status: previousOp.status, body: previousOp.response };
      }
      if (previousOp.status >= 400) {
        return { tipo: 'REPLAY_ERR', op: previousOp, status: previousOp.status, body: previousOp.response };
      }
      // Pendiente - buscar pago asociado
      const pagoAsociado = await tx.pago.findUnique({ where: { operationId: previousOp.id } });
      if (pagoAsociado && pagoAsociado.estado === 'CREANDO') {
        return { tipo: 'REUTILIZAR', op: previousOp, pago: pagoAsociado };
      }
      if (pagoAsociado && pagoAsociado.estado === 'PENDIENTE') {
        return { tipo: 'PENDIENTE_EXISTENTE', op: previousOp, pago: pagoAsociado };
      }
    }
    // Crear operación y pago en CREANDO
    const op = await tx.operation.create({ data: { userId, key, fingerprint, operation: 'payments_checkout', status: 202, response: {} } });
    const pago = await repositorio.crearPago(tx, {
      userId,
      monto: montoDec,
      moneda: env.STRIPE_CURRENCY,
      estado: 'CREANDO',
      stripeSessionId: null,
      operationId: op.id,
      parametrosStripe: construirParametrosStripe({ pagoId: null, montoDec, centavos, userId, ahora }),
    });
    // Actualizar parámetros con pagoId
    const params = construirParametrosStripe({ pagoId: pago.id, montoDec, centavos, userId, ahora });
    await tx.pago.update({ where: { id: pago.id }, data: { parametrosStripe: params } });
    await tx.operation.update({ where: { id: op.id }, data: { status: 202, response: { pagoId: pago.id, estado: 'CREANDO', operationId: op.id } } });
    return { tipo: 'CREAR', op: { ...op, status: 202 }, pago: { ...pago, parametrosStripe: params } };
  });

  if (fase1.tipo === 'REPLAY_OK') {
    const body = fase1.body || {};
    return { ...body, operationId: fase1.op.id, _status: fase1.status, _replayed: true };
  }
  if (fase1.tipo === 'REPLAY_ERR') {
    throw new ApiError(fase1.status || 400, fase1.body?.error || 'Error en pago', fase1.body?.detalles, fase1.body?.codigo);
  }
  if (fase1.tipo === 'PENDIENTE_EXISTENTE' && fase1.pago) {
    const pago = fase1.pago;
    if (pago.stripeSessionId) {
      try {
        const session = await obtenerStripe().checkout.sessions.retrieve(pago.stripeSessionId);
        if (session.url) {
          return { pagoId: pago.id, checkoutUrl: session.url, expiraEn: pago.parametrosStripe?.expires_at ? new Date(pago.parametrosStripe.expires_at * 1000).toISOString() : null, operationId: fase1.op.id };
        }
      } catch {}
    }
    const err = new ApiError(202, 'Checkout en proceso', undefined, 'CHECKOUT_CREATING');
    err.headers = { 'Retry-After': '2' };
    err.bodyExtra = { pagoId: pago.id, estado: 'CREANDO', operationId: fase1.op.id };
    throw err;
  }
  if (fase1.tipo === 'REUTILIZAR' && fase1.pago) {
    const err = new ApiError(202, 'Checkout en proceso', undefined, 'CHECKOUT_CREATING');
    err.headers = { 'Retry-After': '2' };
    err.bodyExtra = { pagoId: fase1.pago.id, estado: 'CREANDO', operationId: fase1.op.id };
    throw err;
  }
  if (fase1.tipo !== 'CREAR') {
    const err = new ApiError(202, 'Checkout en proceso', undefined, 'CHECKOUT_CREATING');
    err.headers = { 'Retry-After': '2' };
    err.bodyExtra = { pagoId: fase1.pago?.id, estado: 'CREANDO', operationId: fase1.op?.id };
    throw err;
  }

  // Crear sesión en Stripe fuera de transacción
  const pago = fase1.pago;
  const params = pago.parametrosStripe || construirParametrosStripe({ pagoId: pago.id, montoDec, centavos, userId, ahora });
  let session;
  try {
    session = await obtenerStripe().checkout.sessions.create(params, {
      idempotencyKey: `casino_checkout_${pago.id}`,
      maxNetworkRetries: 0,
      timeout: 5000,
    });
  } catch (e) {
    try {
      await enTransaccion(userId, async (tx) => {
        await tx.pago.update({ where: { id: pago.id }, data: { estado: 'FALLIDO' } });
        await tx.operation.update({ where: { id: fase1.op.id }, data: { status: 400, response: { error: 'No se pudo crear la sesión de pago', codigo: 'PAYMENT_CREATION_FAILED' } } });
      });
    } catch {}
    const err = new ApiError(202, 'No se pudo confirmar la creación de la sesión; reintenta con la misma clave', undefined, 'CHECKOUT_CREATING');
    err.headers = { 'Retry-After': '2' };
    err.bodyExtra = { pagoId: pago.id, estado: 'CREANDO', operationId: fase1.op.id };
    throw err;
  }

  try {
    await enTransaccion(userId, async (tx) => {
      const pagoActual = await tx.pago.findUnique ? await tx.pago.findUnique({ where: { id: pago.id } }) : null;
      if (pagoActual?.estado === 'PAGADO') {
        return;
      }
      await repositorio.actualizarSesion(tx, pago.id, session.id);
      await tx.pago.update({ where: { id: pago.id }, data: { estado: 'PENDIENTE' } });
      const body = { pagoId: pago.id, checkoutUrl: session.url, expiraEn: new Date(session.expires_at * 1000).toISOString(), operationId: fase1.op.id };
      await tx.operation.update({ where: { id: fase1.op.id }, data: { status: 201, response: body } });
    });
  } catch (e) {
    throw new ApiError(500, 'Error al finalizar checkout', undefined, 'CHECKOUT_FINALIZE_ERROR');
  }

  return { pagoId: pago.id, checkoutUrl: session.url, expiraEn: new Date(session.expires_at * 1000).toISOString(), operationId: fase1.op.id };
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
  if (pago.estado === 'PAGADO') return consultarPago(userId, pagoId, deps);
  if (!pago.stripeSessionId) {
    // Aún en CREANDO, intentar reconciliar
    return consultarPago(userId, pagoId, deps);
  }
  if (pago.estado !== 'PENDIENTE') return consultarPago(userId, pagoId, deps);

  const session = await obtenerStripe().checkout.sessions.retrieve(pago.stripeSessionId);
  await confirmarPago(session, deps);
  return consultarPago(userId, pagoId, deps);
}

/** Webhook: traduce el evento a confirmarPago; nunca acredita por sí mismo. */
export async function procesarEvento(event, deps = {}) {
  const { prisma: db, userTransaction: enTransaccion } = dependencias(deps);
  const { type, data } = event;

  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    return confirmarPago(data.object, deps);
  }
  if (type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') {
    const sessionId = data.object?.id;
    let pago = null;
    if (sessionId) pago = await db.pago.findUnique({ where: { stripeSessionId: sessionId } });
    if (!pago && data.object?.metadata?.pagoId) pago = await db.pago.findUnique({ where: { id: data.object.metadata.pagoId } });
    if (pago && (pago.estado === 'PENDIENTE' || pago.estado === 'CREANDO')) {
      await enTransaccion(pago.userId, (tx) =>
        tx.pago.updateMany({ where: { id: pago.id, estado: { in: ['PENDIENTE', 'CREANDO'] } }, data: { estado: type === 'checkout.session.expired' ? 'EXPIRADO' : 'FALLIDO' } }));
    }
    return { estado: 'SIN_CAMBIO', acreditado: false };
  }
  return { estado: 'IGNORADO', acreditado: false };
}
