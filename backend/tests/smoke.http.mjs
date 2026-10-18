// Smoke test SIN base de datos: levanta la app y verifica que las
// cadenas de middleware responden (400 por DTO inválido, 401 sin token,
// 404 en ruta inexistente). No requiere PostgreSQL.

import { buildApp } from '../src/app.js';

const app = buildApp();

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  let fallos = 0;

  const check = async (nombre, metodo, ruta, body, headers, esperado) => {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ok = res.status === esperado;
    if (!ok) fallos++;
    console.log(`${ok ? '✅' : '❌'} ${nombre} → ${res.status} (esperado ${esperado})`);
    return res;
  };

  // 1. Ruta inexistente → 404 del handler
  await check('404 ruta inexistente', 'GET', '/no-existe', null, {}, 404);

  // 2. Login con email inválido (int como email) → 400 del DTO
  await check('DTO rechaza email numérico', 'POST', '/api/auth/login',
    { email: 12345, password: 'x' }, {}, 400);

  // 3. Register con password corta → 400 del DTO
  await check('DTO rechaza password corta', 'POST', '/api/auth/register',
    { email: 'a@b.com', password: '123', nombre: 'Test' }, {}, 400);

  // 4. Recurso propio sin token → 401 del auth middleware
  await check('Auth rechaza sin token', 'GET', '/api/wallet', null, {}, 401);

  // 5. Token basura → 401
  await check('Auth rechaza token inválido', 'GET', '/api/wallet',
    null, { Authorization: 'Bearer token-basura' }, 401);

  // 6. Plinko bet sin token → 401 (la ruta existe y está protegida)
  await check('Ruta plinko protegida', 'POST', '/api/games/plinko/bet',
    { apuesta: 10, riesgo: 'PEQUENO' }, {}, 401);

  // 7. Blackjack start sin token → 401
  await check('Ruta blackjack protegida', 'POST', '/api/games/blackjack/start',
    { apuesta: 10 }, {}, 401);

  // 8. Health check responde (503 sin DB local, pero el server no crashea)
  const health = await fetch(`${base}/health`);
  const body = await health.json();
  console.log(`ℹ️  /health → ${health.status} ${JSON.stringify(body)}`);

  server.close();
  if (fallos > 0) {
    console.error(`\n💥 ${fallos} verificaciones fallaron`);
    process.exit(1);
  }
  console.log('\n🎉 Smoke test superado: estructura y middleware OK');
});
