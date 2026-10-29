import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Nunca usar la URL normal de la app: exige un destino de pruebas explícito.
const database = process.env.INTEGRATION_DATABASE_URL;
if (!database || !/test/i.test(new URL(database).pathname)) {
  throw new Error('INTEGRATION_DATABASE_URL debe apuntar a una base dedicada cuyo nombre contenga test');
}
process.env.DATABASE_URL = database;
process.env.DIRECT_URL = database;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'integration-only-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET = 'integration-only-refresh-secret-1234567890';
process.env.CORS_ORIGINS = 'http://localhost:5173';

const { prisma } = await import('../../src/shared/prisma.client.js');
const { executeOperation } = await import('../../src/shared/operations.js');
const { userTransaction } = await import('../../src/shared/transaction.js');
const transactions = await import('../../src/modules/transactions/transaction.service.js');
const blackjack = await import('../../src/modules/games/blackjack/blackjack.service.js');
const plinko = await import('../../src/modules/games/plinko/plinko.service.js');
const auth = await import('../../src/modules/auth/auth.service.js');
const { buildApp } = await import('../../src/app.js');
const { default: jwt } = await import('jsonwebtoken');
const ids = [];
const server = buildApp().listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function user() {
  const id = randomUUID();
  await prisma.user.create({ data: { id, publicId: randomUUID(), email: `${id}@example.test`, passwordHash: 'not-a-login-fixture', nombre: 'Integration', wallet: { create: {} } } });
  ids.push(id);
  return id;
}
const token = (id) => jwt.sign({ rol: 'JUGADOR' }, process.env.JWT_ACCESS_SECRET, { subject: id, expiresIn: '30m' });
async function request(id, method, path, body, key, accessToken) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken || id ? { Authorization: `Bearer ${accessToken ?? token(id)}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function fixture(id, { cards = ['8♠', '8♥'], dealer = ['10♣', '7♦'], shoe = ['2♠', '3♣', '8♦', '8♣'], apuesta = 10 } = {}) {
  return userTransaction(id, async (tx) => {
    const { debitar } = await import('../../src/shared/utils/ledger.js');
    await debitar(tx, id, apuesta, 'blackjack', 'Test fixture wager');
    return tx.partidaBlackjack.create({ data: { userId: id, apuesta, dealer: { cartas: dealer }, baraja: shoe, manos: [{ cartas: cards, apuesta, estado: 'ACTIVA', doblada: false, dividida: false, ganancia: null }] } });
  });
}
const deposit = (id, monto) => transactions.depositar(id, { monto, metodo: 'simulado' });
const balance = async (id) => Number((await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).saldo);

after(async () => {
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  // Solo borra las cuentas que creó este proceso, nunca tablas completas.
  await prisma.movimiento.deleteMany({ where: { userId: { in: ids } } });
  await prisma.operation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test('backend persistente y contrato HTTP', async (t) => {
  await t.test('depósitos concurrentes mantienen una cadena de ledger coherente', async () => {
    const id = await user();
    await Promise.all(Array.from({ length: 12 }, () => deposit(id, 10)));
    assert.equal(await balance(id), 120);
    const rows = await prisma.movimiento.findMany({ where: { userId: id } });
    assert.deepEqual(rows.map((m) => Number(m.saldoAntes)).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i * 10));
    assert.ok(rows.every((m) => Number(m.saldoDespues) - Number(m.saldoAntes) === 10));
  });

  await t.test('dos retiros compiten sin saldo negativo ni movimiento rechazado', async () => {
    const id = await user(); await deposit(id, 100);
    const results = await Promise.allSettled([transactions.retirar(id, { monto: 80, metodo: 'simulado' }), transactions.retirar(id, { monto: 80, metodo: 'simulado' })]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await balance(id), 20);
    assert.equal(await prisma.movimiento.count({ where: { userId: id, tipo: 'RETIRO' } }), 1);
  });

  await t.test('idempotencia HTTP concurrente, reconciliación y conflicto de payload', async () => {
    const id = await user(); const key = randomUUID();
    const [a, b] = await Promise.all([request(id, 'POST', '/api/transactions/deposit', { monto: 50 }, key), request(id, 'POST', '/api/transactions/deposit', { monto: 50 }, key)]);
    assert.equal(a.status, 201); assert.equal(b.status, 201); assert.deepEqual(a.body, b.body);
    assert.equal(await balance(id), 50);
    assert.equal(await prisma.movimiento.count({ where: { operationId: a.body.operationId } }), 1);
    assert.ok([a, b].some((r) => r.headers.get('Idempotency-Replayed') === 'true'));
    const recovered = await request(id, 'GET', `/api/operations/${key}`);
    assert.deepEqual(recovered.body.response, a.body);
    assert.equal((await request(id, 'POST', '/api/transactions/deposit', { monto: 51 }, key)).status, 409);
    assert.equal((await request(await user(), 'GET', `/api/operations/${key}`)).status, 404);
  });

  await t.test('fallo tras débito revierte ledger, operación y saldo', async () => {
    const id = await user(); await deposit(id, 20); const key = randomUUID();
    await assert.rejects(executeOperation(id, key, 'failure', {}, 200, async () => {
      await transactions.retirar(id, { monto: 10, metodo: 'simulado' });
      throw new Error('injected failure');
    }), /injected failure/);
    assert.equal(await balance(id), 20);
    assert.equal(await prisma.movimiento.count({ where: { userId: id } }), 1);
    assert.equal(await prisma.operation.count({ where: { userId: id, key } }), 0);
  });

  await t.test('saldo máximo se rechaza sin perder atomicidad', async () => {
    const id = await user(); await deposit(id, 9999999999.99);
    await assert.rejects(deposit(id, 0.01), (e) => e.code === 'BALANCE_LIMIT');
    assert.equal(await prisma.movimiento.count({ where: { userId: id } }), 1);
  });

  await t.test('configuración de Plinko con saldo cero y apuestas en los tres riesgos', async () => {
    const id = await user();
    const config = await request(id, 'GET', '/api/games/plinko/config');
    assert.equal(config.status, 200); assert.equal(config.body.filas, 9);
    await deposit(id, 10000);
    for (const risk of config.body.riesgos) {
      const r = await request(id, 'POST', '/api/games/plinko/bet', { apuesta: risk.apuestaMinima, riesgo: risk.riesgo }, randomUUID());
      assert.equal(r.status, 201);
      assert.equal(r.body.ruta.length, 9);
      assert.equal(r.body.slot, r.body.ruta.filter((v) => v === 'D').length);
      assert.equal(r.body.multiplicador, risk.multiplicadores[r.body.slot]);
      assert.equal(r.body.saldoActual, await balance(id));
      assert.equal(r.body.seed, undefined);
      assert.ok(r.body.rondaId);
    }
  });

  await t.test('ruleta liquida una vez, conserva ledger y bloquea combinaciones inválidas', async () => {
    const id = await user(); await deposit(id, 100);
    const key = randomUUID();
    const bet = { apuesta: 10, tipo: 'color', seleccion: 'rojo' };
    const first = await request(id, 'POST', '/api/games/roulette/bet', bet, key);
    const replay = await request(id, 'POST', '/api/games/roulette/bet', bet, key);
    assert.equal(first.status, 201); assert.deepEqual(replay.body, first.body);
    assert.equal(replay.headers.get('Idempotency-Replayed'), 'true');
    assert.equal(first.body.saldoActual, 90 + first.body.ganancia);
    assert.equal(await balance(id), first.body.saldoActual);
    assert.equal(await prisma.movimiento.count({ where: { operationId: first.body.operationId, tipo: 'APUESTA', juego: 'roulette' } }), 1);
    assert.equal(await prisma.movimiento.count({ where: { operationId: first.body.operationId, tipo: 'PREMIO', juego: 'roulette' } }), first.body.ganancia ? 1 : 0);
    assert.equal((await request(id, 'POST', '/api/games/roulette/bet', { apuesta: 10, tipo: 'pleno', seleccion: 37 }, randomUUID())).status, 400);
    assert.equal((await request(id, 'GET', '/api/games/roulette/rounds')).body.items.length, 1);
  });

  await t.test('póker recupera partida propia, oculta mazo y liquida una sola vez', async () => {
    const id = await user(); await deposit(id, 100);
    const startKey = randomUUID();
    const start = await request(id, 'POST', '/api/games/poker/start', { apuesta: 10 }, startKey);
    assert.equal(start.status, 201); assert.equal(start.body.version, 0);
    assert.equal(start.body.cartas.length, 5); assert.equal(start.body.baraja, undefined);
    assert.equal(start.body.saldoActual, 90);
    assert.equal((await request(id, 'GET', '/api/games/poker/active')).body.partida.partidaId, start.body.partidaId);
    const path = `/api/games/poker/${start.body.partidaId}`;
    assert.equal((await request(await user(), 'GET', path)).status, 404);
    assert.equal((await request(id, 'POST', '/api/games/poker/start', { apuesta: 10 }, randomUUID())).status, 409);
    const drawKey = randomUUID();
    const draw = await request(id, 'POST', `${path}/draw`, { version: 0, conservar: [0, 2] }, drawKey);
    assert.equal(draw.status, 200); assert.equal(draw.body.version, 1);
    assert.equal(draw.body.saldoActual, 90 + draw.body.ganancia);
    assert.equal(await balance(id), draw.body.saldoActual);
    assert.equal((await request(id, 'POST', `${path}/draw`, { version: 0, conservar: [0, 2] }, drawKey)).body.operationId, draw.body.operationId);
    assert.equal((await request(id, 'POST', `${path}/draw`, { version: 0, conservar: [] }, randomUUID())).status, 409);
    assert.equal((await request(await user(), 'POST', `${path}/draw`, { version: 0, conservar: [] }, randomUUID())).status, 404);
    assert.equal((await request(id, 'GET', '/api/games/poker/active')).body.partida, null);
    assert.equal((await prisma.movimiento.count({ where: { userId: id, juego: 'poker', tipo: 'APUESTA' } })), 1);
    assert.equal((await prisma.movimiento.count({ where: { userId: id, juego: 'poker', tipo: 'PREMIO' } })), draw.body.ganancia ? 1 : 0);
  });

  await t.test('Blackjack reconstruye columnas JSON, oculta dealer y comprueba ownership', async () => {
    const id = await user(); await deposit(id, 100); const p = await fixture(id);
    const state = await request(id, 'GET', `/api/games/blackjack/${p.id}`);
    assert.equal(state.status, 200); assert.equal(state.body.dealer.cartas[1], '🂠');
    assert.equal(state.body.baraja, undefined); assert.equal(state.body.resultado, null);
    assert.ok(state.body.accionesPermitidas.includes('split'));
    assert.equal((await request(id, 'GET', '/api/games/blackjack/active')).body.partida.partidaId, p.id);
    assert.equal((await request(await user(), 'GET', `/api/games/blackjack/${p.id}`)).status, 404);
    assert.equal((await request(id, 'POST', '/api/games/blackjack/start', { apuesta: 10 }, randomUUID())).status, 409);
  });

  await t.test('acciones concurrentes con versión antigua: un ganador, sin pérdida de estado', async () => {
    const id = await user(); await deposit(id, 100); const p = await fixture(id, { cards: ['2♠', '3♣'] });
    const path = `/api/games/blackjack/${p.id}/hit`;
    const results = await Promise.all([request(id, 'POST', path, { version: 0 }, randomUUID()), request(id, 'POST', path, { version: 0 }, randomUUID())]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const state = await blackjack.consultar(id, p.id);
    assert.equal(state.version, 1); assert.equal(state.manos[0].cartas.length, 3);
  });

  await t.test('doble repetido devuelve respuesta original incluso tras finalizar', async () => {
    const id = await user(); await deposit(id, 100); const p = await fixture(id, { cards: ['10♠', '9♣'], shoe: ['2♠'] });
    const key = randomUUID(); const path = `/api/games/blackjack/${p.id}/double`;
    const a = await request(id, 'POST', path, { version: 0 }, key);
    const b = await request(id, 'POST', path, { version: 0 }, key);
    assert.equal(a.status, 200); assert.deepEqual(a.body, b.body);
    assert.equal(a.body.saldoActual, 120);
    assert.equal(await prisma.movimiento.count({ where: { userId: id, tipo: 'PREMIO' } }), 1);
    assert.equal((await request(id, 'POST', path, { version: 1 }, randomUUID())).status, 404);
  });

  await t.test('split puede alcanzar tres manos y nunca cuatro', async () => {
    const id = await user(); await deposit(id, 100); const p = await fixture(id);
    const first = await blackjack.dividir(id, p.id);
    assert.equal(first.manos.length, 2);
    const second = await blackjack.dividir(id, p.id);
    assert.equal(second.manos.length, 3); assert.equal(second.saldoActual, 70);
    assert.ok(!second.accionesPermitidas.includes('split'));
    await assert.rejects(blackjack.dividir(id, p.id), (e) => e.statusCode === 400);
  });

  await t.test('naturales de apertura devuelven saldo después del premio', async () => {
    for (const [cards, expected, saldo] of [
      [['A♠', '10♣', 'K♥', '7♦'], 'GANADA', 115],
      [['A♠', 'A♣', 'K♥', 'K♦'], 'EMPATE', 100],
      [['9♠', 'A♣', 'K♥', 'K♦'], 'PERDIDA', 90],
    ]) {
      const id = await user(); await deposit(id, 100);
      const result = await blackjack.iniciar(id, { apuesta: 10 }, { shoeFactory: () => [...cards].reverse() });
      assert.equal(result.estado, expected); assert.equal(result.saldoActual, saldo);
      assert.equal(result.saldoActual, await balance(id));
      assert.equal((await blackjack.consultar(id, result.partidaId)).manos[0].ganancia, saldo - 90);
    }
  });

  await t.test('dos inicios simultáneos dejan una sola activa y un solo débito', async () => {
    const id = await user(); await deposit(id, 100);
    const options = { shoeFactory: () => ['7♣', '8♠', '10♦', '9♥'] };
    const results = await Promise.allSettled([blackjack.iniciar(id, { apuesta: 10 }, options), blackjack.iniciar(id, { apuesta: 10 }, options)]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await balance(id), 90);
    assert.equal(await prisma.partidaBlackjack.count({ where: { userId: id, estado: 'ACTIVA' } }), 1);
  });

  await t.test('split y doble sin saldo no cambian cartas, versión ni ledger', async () => {
    const id = await user(); await deposit(id, 10); const p = await fixture(id);
    const before = await blackjack.consultar(id, p.id);
    assert.ok(!before.accionesPermitidas.includes('double'));
    assert.ok(!before.accionesPermitidas.includes('split'));
    await assert.rejects(blackjack.dividir(id, p.id), (e) => e.code === 'INSUFFICIENT_BALANCE');
    await assert.rejects(blackjack.doblar(id, p.id), (e) => e.code === 'INSUFFICIENT_BALANCE');
    assert.deepEqual(await blackjack.consultar(id, p.id), before);
    assert.equal(await prisma.movimiento.count({ where: { userId: id } }), 2);
  });

  await t.test('ases divididos se plantan y no cobran natural 3:2', async () => {
    const id = await user(); await deposit(id, 100);
    const p = await fixture(id, { cards: ['A♠', 'A♥'], shoe: ['K♠', 'Q♥'] });
    const state = await blackjack.dividir(id, p.id);
    assert.equal(state.estado, 'GANADA'); assert.equal(state.saldoActual, 120);
    assert.ok(state.manos.every((m) => m.ganancia === 20 && m.dividida));
  });

  await t.test('rendición reconcilia todas las manos y devolución redondeada', async () => {
    const id = await user(); await deposit(id, 100);
    const p = await fixture(id, { apuesta: 10.01 });
    await blackjack.dividir(id, p.id);
    const result = await blackjack.salir(id, p.id);
    assert.equal(result.devuelto, 10.01); assert.equal(result.saldoActual, 89.99);
    assert.equal(result.manos.reduce((sum, m) => sum + Math.round(m.ganancia * 100), 0), 1001);
    assert.ok(result.manos.every((m) => m.estado === 'RENDIDA'));
    assert.deepEqual(result.accionesPermitidas, []);
    assert.equal((await blackjack.activa(id)).partida, null);
  });

  await t.test('crupier bust, empate, pérdida y doble tras split', async () => {
    for (const [dealer, cards, shoe, expected, saldo] of [
      [['10♣', '6♦'], ['10♠', '8♥'], ['K♥'], 'GANADA', 110],
      [['10♣', '8♦'], ['10♠', '8♥'], ['2♥'], 'EMPATE', 100],
      [['10♣', '9♦'], ['10♠', '8♥'], ['2♥'], 'PERDIDA', 90],
    ]) {
      const id = await user(); await deposit(id, 100); const p = await fixture(id, { dealer, cards, shoe });
      const result = await blackjack.plantarse(id, p.id);
      assert.equal(result.estado, expected); assert.equal(result.saldoActual, saldo);
    }
    const id = await user(); await deposit(id, 100); const p = await fixture(id);
    const split = await blackjack.dividir(id, p.id);
    assert.equal(split.estado, 'ACTIVA');
    assert.equal(split.dealer.cartas[1], '🂠');
    assert.ok(split.accionesPermitidas.includes('double'));
    const result = await blackjack.doblar(id, p.id);
    assert.ok(result.manos[0].doblada); assert.equal(result.manos[0].apuesta, 20);
  });

  await t.test('consumo concurrente de refresh crea exactamente un sucesor', async () => {
    const registration = await auth.register({ email: `${randomUUID()}@example.test`, password: 'integration-password', nombre: 'Session Test' });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: registration.email } }); ids.push(stored.id);
    const session = await auth.login({ email: registration.email, password: 'integration-password' });
    const rotated = await Promise.allSettled([auth.refresh(session.refreshToken), auth.refresh(session.refreshToken)]);
    assert.equal(rotated.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await prisma.refreshToken.count({ where: { userId: stored.id, revokedAt: null } }), 1);
    await assert.rejects(auth.refresh(session.refreshToken), (e) => e.statusCode === 401);
    const next = rotated.find((r) => r.status === 'fulfilled').value;
    await auth.logout(next.refreshToken, await user());
    const stillValid = await auth.refresh(next.refreshToken);
    await auth.logout(stillValid.refreshToken, stored.id);
    await assert.rejects(auth.refresh(stillValid.refreshToken), (e) => e.statusCode === 401);
  });

  await t.test('contrato HTTP: claves, versión, métodos simulados, fechas y preflight', async () => {
    const id = await user();
    const emptyBalance = await request(id, 'GET', '/api/wallet/balance');
    assert.equal(emptyBalance.status, 200); assert.equal(emptyBalance.body.historial.resultadoNeto, 0);
    assert.equal((await request(id, 'POST', '/api/transactions/deposit', { monto: 10 })).status, 400);
    assert.equal((await request(id, 'POST', '/api/transactions/deposit', { monto: 1, metodo: 'tarjeta' }, randomUUID())).status, 400);
    assert.equal((await request(id, 'GET', '/api/transactions/history?desde=2026-10-19T00:00:00Z&hasta=2026-10-18T00:00:00Z')).status, 400);
    const history = await request(id, 'GET', '/api/transactions/history?pagina=1');
    assert.equal(history.status, 200); assert.equal(history.body.paginacion.pagina, 1);
    const cors = await fetch(base + '/api/transactions/deposit', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'idempotency-key,authorization,content-type' } });
    assert.equal(cors.status, 204);
    assert.ok(cors.headers.get('Access-Control-Allow-Headers').includes('Idempotency-Key'));
  });

  await t.test('recorrido HTTP con credenciales emitidas por login', async () => {
    const email = `${randomUUID()}@example.test`;
    const credentials = { email, password: 'http-integration-password', nombre: 'HTTP Player' };
    assert.equal((await request(null, 'POST', '/api/auth/register', credentials)).status, 201);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } }); ids.push(stored.id);
    const login = await request(null, 'POST', '/api/auth/login', credentials);
    assert.equal(login.status, 200);
    const call = (method, path, body, key) => request(null, method, path, body, key, login.body.accessToken);
    assert.equal((await call('PATCH', '/api/users/profile', { nombre: 'Updated Player' })).body.nombre, 'Updated Player');
    const deposited = await call('POST', '/api/transactions/deposit', { monto: 250 }, randomUUID());
    assert.equal(deposited.status, 201);
    const bet = await call('POST', '/api/games/plinko/bet', { apuesta: 10, riesgo: 'PEQUENO' }, randomUUID());
    assert.equal(bet.status, 201);
    const startKey = randomUUID();
    const game = await call('POST', '/api/games/blackjack/start', { apuesta: 10 }, startKey);
    assert.equal(game.status, 201);
    assert.deepEqual((await call('POST', '/api/games/blackjack/start', { apuesta: 10 }, startKey)).body, game.body);
    if (game.body.estado === 'ACTIVA') {
      assert.equal((await call('GET', '/api/games/blackjack/active')).body.partida.partidaId, game.body.partidaId);
      assert.equal((await call('POST', `/api/games/blackjack/${game.body.partidaId}/exit`, { version: game.body.version }, randomUUID())).status, 200);
    }
    const withdrawal = await call('POST', '/api/transactions/withdraw', { monto: 10 }, randomUUID());
    assert.equal(withdrawal.status, 200);
    assert.equal((await call('GET', '/api/wallet')).body.saldo, withdrawal.body.saldoActual);
    const history = await call('GET', '/api/transactions/history');
    assert.ok(history.body.items.some((m) => m.tipo === 'RETIRO'));
    const rotated = await request(null, 'POST', '/api/auth/refresh', { refreshToken: login.body.refreshToken });
    assert.equal(rotated.status, 200);
    assert.equal((await request(null, 'POST', '/api/auth/logout', { refreshToken: rotated.body.refreshToken }, undefined, rotated.body.accessToken)).status, 200);
    assert.equal((await request(null, 'POST', '/api/auth/refresh', { refreshToken: rotated.body.refreshToken })).status, 401);
  });
});
