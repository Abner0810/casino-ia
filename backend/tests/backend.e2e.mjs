import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

// Require an explicitly selected local disposable database; never fall back to .env.
const database = process.env.TEST_DATABASE_URL;
assert.ok(database, 'TEST_DATABASE_URL debe apuntar a PostgreSQL aislado con migraciones aplicadas');
const target = new URL(database);
assert.ok(['localhost', '127.0.0.1', 'postgres'].includes(target.hostname), 'Solo bases locales de prueba');
assert.match(target.pathname, /test/i, 'El nombre de la base debe incluir test');
Object.assign(process.env, {
  NODE_ENV: 'test', DATABASE_URL: database, DIRECT_URL: database,
  JWT_ACCESS_SECRET: 'test-access-secret-for-isolated-e2e-only-123',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-isolated-e2e-only-123',
  CORS_ORIGINS: 'http://localhost:3001',
});
const { buildApp } = await import('../src/app.js');
const { prisma } = await import('../src/shared/prisma.client.js');
let server, base, token, refreshToken;
const email = `e2e-${randomUUID()}@example.com`;
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(), ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  await prisma.$queryRaw`SELECT 1`;
  server = buildApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.movimiento.deleteMany({ where: { user: { email } } });
  await prisma.operation.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});
test('HTTP real: salud, validación, autenticación y operaciones monetarias', async t => {
  await t.test('la raíz de Render abre la aplicación sin redirigir rutas de API', async () => {
    for (const path of ['/', '/?next=https://example.com']) {
      const response = await fetch(base + path, { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), 'https://casino-ia-4e7b6.web.app');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal((await request('/api/no-existe')).status, 404);
    assert.equal((await request('/', { method: 'POST', body: {} })).status, 404);
  });
  await t.test('health y rutas protegidas', async () => {
    assert.deepEqual(await request('/health'), { status: 200, body: { status: 'ok', db: 'up' } });
    assert.equal((await request('/api/wallet', { auth: false })).status, 401);
    assert.equal((await request('/no-existe')).status, 404);
    assert.equal((await request('/api/auth/register', { method: 'POST', body: { email, nombre: 'Test', password: 'x' } })).status, 400);
  });
  await t.test('registro y login sin filtrar credenciales', async () => {
    const registered = await request('/api/auth/register', { method: 'POST', body: { email, nombre: 'E2E Test', password: 'Valid-password-123!' } });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.passwordHash, undefined);
    assert.equal(registered.body.id, undefined);
    const login = await request('/api/auth/login', { method: 'POST', body: { email, password: 'Valid-password-123!' } });
    assert.equal(login.status, 200);
    token = login.body.accessToken;
    refreshToken = login.body.refreshToken;
    assert.ok(token && refreshToken);
  });
  await t.test('balance de usuario sin movimientos', async () => {
    const balance = await request('/api/wallet/balance');
    assert.equal(balance.status, 200);
    assert.equal(balance.body.historial.resultadoNeto, 0);
  });
  await t.test('depósitos concurrentes conservan saldo y cadena ledger', async () => {
    const results = await Promise.all([10, 20, 30].map(monto => request('/api/transactions/deposit', { method: 'POST', body: { monto } })));
    assert.deepEqual(results.map(r => r.status), [201, 201, 201]);
    assert.equal((await request('/api/wallet')).body.saldo, 60);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const movements = await prisma.movimiento.findMany({ where: { userId: user.id } });
    assert.equal(movements.length, 3);
    for (const m of movements) assert.ok(m.saldoAntes.add(m.monto).equals(m.saldoDespues));
    assert.equal(new Set(movements.map(m => m.saldoAntes.toString())).size, 3);
  });
  await t.test('retiros concurrentes no permiten sobregiro y rechazan precisión inválida', async () => {
    assert.equal((await request('/api/transactions/withdraw', { method: 'POST', body: { monto: 0.001 } })).status, 400);
    const results = await Promise.all([1, 2].map(() => request('/api/transactions/withdraw', { method: 'POST', body: { monto: 40 } })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
    assert.equal((await request('/api/wallet')).body.saldo, 20);
    const history = await request('/api/transactions/history?tipo=RETIRO');
    assert.equal(history.status, 200);
    assert.equal(history.body.items.length, 1);
  });
  await t.test('plinko liquida apuesta, premio e historial', async () => {
    const played = await request('/api/games/plinko/bet', { method: 'POST', body: { apuesta: 1, riesgo: 'PEQUENO' } });
    assert.equal(played.status, 201);
    assert.equal(played.body.ruta.length, 9);
    assert.equal(played.body.saldoActual, Number((19 + played.body.ganancia).toFixed(2)));
    assert.equal((await request('/api/wallet')).body.saldo, played.body.saldoActual);
  });
  await t.test('blackjack start real y hit/stand mantienen respuesta y saldo persistido', async () => {
    const started = await request('/api/games/blackjack/start', { method: 'POST', body: { apuesta: 10 } });
    assert.equal(started.status, 201);
    assert.ok(started.body.partidaId);
    assert.equal(started.body.saldoActual, (await request('/api/wallet')).body.saldo);
    let current = started.body;
    if (current.estado === 'ACTIVA') {
      const hit = await request(`/api/games/blackjack/${current.partidaId}/hit`, { method: 'POST', body: { version: current.version } });
      assert.equal(hit.status, 200);
      assert.equal(hit.body.manos[0].cartas.length, 3);
      current = hit.body;
      if (current.estado === 'ACTIVA') {
        const stand = await request(`/api/games/blackjack/${current.partidaId}/stand`, { method: 'POST', body: { version: current.version } });
        assert.equal(stand.status, 200);
        current = stand.body;
      }
    }
    assert.notEqual(current.estado, 'ACTIVA');
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal((await request('/api/wallet')).body.saldo, Number(wallet.saldo));
    // Fund the following controlled split fixture independently of random outcomes.
    assert.equal((await request('/api/transactions/deposit', { method: 'POST', body: { monto: 20 } })).status, 201);
  });
  await t.test('blackjack stand concurrente paga una sola vez con mazo controlado', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const before = (await request('/api/wallet')).body.saldo;
    const game = await prisma.partidaBlackjack.create({ data: {
      userId: user.id, apuesta: 10, dealer: { cartas: ['10♠', '8♦'] }, baraja: ['2♣'],
      manos: [{ cartas: ['10♥', 'Q♣'], apuesta: 10, estado: 'ACTIVA', doblada: false, dividida: false, ganancia: null }],
    } });
    const results = await Promise.all([1, 2].map(() => request(`/api/games/blackjack/${game.id}/stand`, { method: 'POST', body: { version: game.version } })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await request('/api/wallet')).body.saldo, Number((before + 20).toFixed(2)));
    assert.equal((await prisma.partidaBlackjack.findUniqueOrThrow({ where: { id: game.id } })).estado, 'GANADA');
  });
  await t.test('blackjack split permite tercera mano y cancelación simulada liquida una sola vez toda la mesa', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const hand = (cartas, estado = 'ACTIVA') => ({ cartas, apuesta: 10, estado, doblada: false, dividida: true, ganancia: null });
    const game = await prisma.partidaBlackjack.create({ data: {
      userId: user.id, apuesta: 10, dealer: { cartas: ['10♠', '8♦'] }, baraja: ['3♣', '2♣'],
      manos: [hand(['8♠', '8♦']), hand(['10♥', 'Q♣'], 'PERDIDA')],
    } });
    const split = await request(`/api/games/blackjack/${game.id}/split`, { method: 'POST', body: { version: game.version } });
    assert.equal(split.status, 200);
    assert.equal(split.body.manos.length, 3);
    const before = (await request('/api/wallet')).body.saldo;
    const results = await Promise.all([1, 2].map(() => request(`/api/games/blackjack/${game.id}/exit`, { method: 'POST', body: { version: split.body.version } })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const exit = results.find(r => r.status === 200).body;
    assert.equal(exit.devuelto, 15);
    assert.ok(exit.manos.every(m => m.estado === 'RENDIDA'));
    assert.equal(exit.manos.reduce((sum, m) => sum + m.ganancia, 0), 15);
    assert.equal((await request('/api/wallet')).body.saldo, Number((before + 15).toFixed(2)));
  });
  await t.test('logout requiere dueño del refresh token', async () => {
    assert.equal((await request('/api/auth/logout', { method: 'POST', auth: false, body: { refreshToken } })).status, 401);
    const jwt = (await import('jsonwebtoken')).default;
    const otherId = randomUUID();
    const otherEmail = `other-${email}`;
    try {
      await prisma.user.create({ data: { id: otherId, publicId: randomUUID(), email: otherEmail, nombre: 'Otro usuario', passwordHash: 'unused-test-fixture' } });
      const original = token;
      token = jwt.sign({ rol: 'JUGADOR' }, process.env.JWT_ACCESS_SECRET, { subject: otherId, expiresIn: '1m' });
      try {
        assert.equal((await request('/api/auth/logout', { method: 'POST', body: { refreshToken } })).status, 200);
      } finally { token = original; }
      const stored = await prisma.refreshToken.findFirstOrThrow({ where: { tokenHash: createHash('sha256').update(refreshToken).digest('hex') } });
      assert.equal(stored.revokedAt, null);
    } finally { await prisma.user.deleteMany({ where: { email: otherEmail } }); }
  });
  await t.test('rotación refresh concurrente admite exactamente un uso y logout revoca', async () => {
    const results = await Promise.all([1, 2].map(() => request('/api/auth/refresh', { method: 'POST', body: { refreshToken } })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
    const next = results.find(r => r.status === 200).body.refreshToken;
    assert.equal((await request('/api/auth/logout', { method: 'POST', body: { refreshToken: next } })).status, 200);
    assert.equal((await request('/api/auth/refresh', { method: 'POST', body: { refreshToken: next } })).status, 401);
  });
});
