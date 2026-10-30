// Pruebas del módulo de pagos: sin red ni base de datos.
// Stripe se simula con dobles inyectados; la firma del webhook se genera
// con la utilidad oficial de Stripe (HMAC local, no hay llamada externa).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { toDecimal } from '../src/shared/utils/money.js';

// Variables antes de importar el servicio (dotenv no pisa lo ya definido).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/casino_test';
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.JWT_ACCESS_SECRET ??= 'isolated-test-access-secret-minimum-32';
process.env.JWT_REFRESH_SECRET ??= 'isolated-test-refresh-secret-minimum-32';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_CURRENCY = 'bob';
process.env.STRIPE_CHECKOUT_BASE_URL = 'https://app.example.com/';

const { checkoutDTO, pagoIdParamDTO } = await import('../src/modules/payments/dto/payment.dto.js');
const { aCentavos, baseUrl, confirmarPago, consultarPago, crearCheckout } = await import('../src/modules/payments/payment.service.js');
const { verificarWebhook } = await import('../src/modules/payments/stripe.client.js');

test('aCentavos convierte Bs a centavos enteros sin floats', () => {
  assert.equal(aCentavos(5), 500);
  assert.equal(aCentavos('499.99'), 49_999);
  assert.equal(aCentavos(toDecimal('0.1').add('0.2')), 30);
});

test('baseUrl normaliza la configuración y quita la barra final', () => {
  assert.equal(baseUrl(), 'https://app.example.com');
});

test('checkoutDTO acepta montos válidos de 5 a 500 con dos decimales', () => {
  for (const monto of [5, 10.25, 500]) {
    assert.equal(checkoutDTO.safeParse({ monto }).success, true, `debe aceptar ${monto}`);
  }
});

test('checkoutDTO rechaza fuera de rango, fracciones extra, texto y campos desconocidos', () => {
  for (const monto of [4.99, 500.01, 0, -1, 10.001, '10', Number.NaN]) {
    assert.equal(checkoutDTO.safeParse({ monto }).success, false, `debe rechazar ${String(monto)}`);
  }
  assert.equal(checkoutDTO.safeParse({ monto: 10, moneda: 'usd' }).success, false);
});

test('pagoIdParamDTO exige un UUID y rechaza rutas maliciosas', () => {
  assert.equal(pagoIdParamDTO.safeParse({ id: randomUUID() }).success, true);
  for (const id of ['abc', '../../etc/passwd']) {
    assert.equal(pagoIdParamDTO.safeParse({ id }).success, false);
  }
});

test('verificarWebhook acepta una firma válida y rechaza una alterada', () => {
  const payload = '{"id":"evt_1","type":"checkout.session.completed"}';
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
  const evento = verificarWebhook(Buffer.from(payload), header);
  assert.equal(evento.id, 'evt_1');

  const alterado = payload.replace('evt_1', 'evt_2');
  assert.throws(() => verificarWebhook(Buffer.from(alterado), header));
});

/** Escenario de confirmación con dobles de prisma, repositorio y ledger. */
function escenario({
  paymentStatus = 'paid',
  amountTotal = 5000,
  currency = 'bob',
  metadata,
  clientReferenceId = 'user-1',
  estadoInicial = 'PENDIENTE',
  acreditarDevuelve = '150',
} = {}) {
  const pago = {
    id: randomUUID(), userId: 'user-1', monto: '50', moneda: 'bob',
    estado: estadoInicial, stripeSessionId: 'cs_test_1',
  };
  const session = {
    id: 'cs_test_1', amount_total: amountTotal, currency, payment_status: paymentStatus,
    payment_intent: 'pi_test_1', metadata: metadata ?? { pagoId: pago.id, userId: pago.userId },
    client_reference_id: clientReferenceId,
  };
  const registro = { pagos: 0, acreditados: 0, movimientos: [] };

  const db = {
    pago: {
      findUnique: async ({ where }) => {
        if (where.stripeSessionId !== undefined) return where.stripeSessionId === pago.stripeSessionId ? pago : null;
        return where.id === pago.id ? pago : null;
      },
      findFirst: async ({ where }) => (where.id === pago.id && where.userId === pago.userId ? pago : null),
    },
  };
  const repo = {
    marcarPagado: async (_tx, id, intent) => {
      registro.pagos += 1;
      if (pago.estado !== 'PENDIENTE' || id !== pago.id) return { count: 0 };
      pago.estado = 'PAGADO';
      pago.stripePaymentIntentId = intent;
      return { count: 1 };
    },
    buscarPorId: async () => pago,
  };
  const deps = {
    prisma: db,
    repo,
    userTransaction: async (_userId, fn) => fn({}),
    acreditar: async (_tx, userId, monto, juego, descripcion, tipo, extra) => {
      registro.acreditados += 1;
      registro.movimientos.push({ userId, monto, juego, descripcion, tipo, extra });
      return acreditarDevuelve;
    },
  };
  return { pago, session, deps, registro };
}

test('confirmarPago acredita una sola vez aunque lleguen webhook y sync', async () => {
  const { pago, session, deps, registro } = escenario();
  const primera = await confirmarPago(session, deps);
  assert.deepEqual(primera, { estado: 'PAGADO', acreditado: true, saldoActual: 150 });
  assert.equal(registro.pagos, 1);
  assert.equal(registro.acreditados, 1);
  assert.equal(registro.movimientos[0].tipo, 'DEPOSITO');
  assert.equal(registro.movimientos[0].extra.pagoId, pago.id);

  const segunda = await confirmarPago(session, deps);
  assert.deepEqual(segunda, { estado: 'PAGADO', acreditado: false });
  assert.equal(registro.pagos, 1, 'no debe volver a marcar el pago');
  assert.equal(registro.acreditados, 1, 'no debe acreditar dos veces');
});

test('confirmarPago no acredita si el importe o la moneda no coinciden', async () => {
  for (const opciones of [{ amountTotal: 4999 }, { currency: 'usd' }]) {
    const { session, deps, registro } = escenario(opciones);
    const resultado = await confirmarPago(session, deps);
    assert.equal(resultado.acreditado, false);
    assert.equal(resultado.motivo, 'MISMATCH');
    assert.equal(registro.pagos, 0);
    assert.equal(registro.acreditados, 0);
  }
});

test('confirmarPago no acredita si metadata o client_reference_id no cuadran', async () => {
  const { pago, session, deps, registro } = escenario({ metadata: { pagoId: randomUUID() } });
  const resultado = await confirmarPago(session, deps);
  assert.equal(resultado.motivo, 'MISMATCH');
  assert.equal(registro.acreditados, 0);
  assert.ok(pago.id);

  const ajeno = escenario({ clientReferenceId: 'otro-usuario' });
  assert.equal((await confirmarPago(ajeno.session, ajeno.deps)).motivo, 'MISMATCH');
  assert.equal(ajeno.registro.acreditados, 0);
});

test('confirmarPago con payment_status distinto de paid no acredita', async () => {
  const { session, deps, registro } = escenario({ paymentStatus: 'unpaid' });
  const resultado = await confirmarPago(session, deps);
  assert.deepEqual(resultado, { estado: 'PENDIENTE', acreditado: false });
  assert.equal(registro.acreditados, 0);
});

test('confirmarPago ignora sesiones desconocidas', async () => {
  const { session, deps } = escenario({ metadata: {} });
  const resultado = await confirmarPago({ ...session, id: 'cs_desconocida' }, deps);
  assert.deepEqual(resultado, { estado: 'DESCONOCIDO', acreditado: false });
});

test('consultarPago devuelve 404 genérico para un pago ajeno o inexistente', async () => {
  const db = { pago: { findFirst: async () => null } };
  await assert.rejects(consultarPago('user-1', randomUUID(), { prisma: db }), (error) => {
    assert.equal(error.statusCode, 404);
    assert.equal(error.message, 'Pago no encontrado');
    return true;
  });
});

test('crearCheckout envía centavos, moneda del servidor y URLs de retorno', async () => {
  const pagoId = randomUUID();
  const llamadas = [];
  const deps = {
    userTransaction: async (_userId, fn) => fn({}),
    repo: {
      crearPago: async (_tx, data) => ({ id: pagoId, ...data }),
      actualizarSesion: async (_tx, id, sessionId) => ({ id, stripeSessionId: sessionId }),
    },
    getStripe: () => ({
      checkout: {
        sessions: {
          create: async (params, options) => {
            llamadas.push({ params, options });
            return { id: 'cs_test_nueva', url: 'https://checkout.stripe.com/c/pay/cs_test_nueva', expires_at: 1_800_000_000 };
          },
        },
      },
    }),
  };

  const resultado = await crearCheckout('user-1', { monto: 50.5 }, deps);
  assert.equal(resultado.pagoId, pagoId);
  assert.equal(resultado.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_nueva');

  const { params, options } = llamadas[0];
  assert.equal(Object.hasOwn(params, 'payment_method_types'), false,
    'Stripe administra los métodos de pago desde el Dashboard');
  assert.equal(params.line_items[0].price_data.unit_amount, 5050);
  assert.equal(params.line_items[0].price_data.currency, 'bob');
  assert.equal(params.metadata.pagoId, pagoId);
  assert.equal(params.client_reference_id, 'user-1');
  assert.equal(params.success_url, `https://app.example.com/billetera/retorno?pago=${pagoId}`);
  assert.equal(params.cancel_url, 'https://app.example.com/billetera?pago=cancelado');
  assert.equal(options.maxNetworkRetries, 0);
  assert.equal(options.timeout, 5000);
  assert.ok(options.idempotencyKey);
});
