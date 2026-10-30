import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDecimal, toNumber, dosDecimales } from '../src/shared/utils/money.js';
import { depositDTO, withdrawDTO } from '../src/modules/transactions/dto/transaction.dto.js';
import { startDTO as blackjackStartDTO } from '../src/modules/games/blackjack/dto/blackjack.dto.js';
import { registerDTO, loginDTO } from '../src/modules/auth/dto/auth.dto.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Los procesos de validación no deben completar variables desde el .env local.
const isolatedEnvPath = fileURLToPath(new URL('./fixtures/empty-env.txt', import.meta.url));

test('dinero conserva centavos al sumar y redondear premios', () => {
  assert.equal(toNumber(toDecimal('0.1').add('0.2')), 0.3);
  assert.equal(dosDecimales('1.235').toString(), '1.24');
});

for (const [name, dto, maximo] of [['deposit', depositDTO, 1_000_000], ['withdraw', withdrawDTO, 500]]) {
  test(`${name} rechaza montos negativos, cero, fracciones extra y fuera de límite`, () => {
    for (const monto of [-1, 0, 0.001, maximo + 0.01, 1_000_001, Infinity, NaN, '10']) {
      assert.equal(dto.safeParse({ monto }).success, false, String(monto));
    }
    for (const monto of [0.01, 10.25, maximo]) {
      assert.equal(dto.safeParse({ monto }).success, true, String(monto));
    }
  });
}

test('el servicio rechaza retiros sobre 500 antes de conectar a la base de datos', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { retirar } = await import('./src/modules/transactions/transaction.service.js');
    for (const monto of [500.01, 501, 1000000]) {
      await assert.rejects(retirar('sin-conexion', { monto, metodo: 'simulado' }),
        (error) => error.statusCode === 400 && error.code === 'WITHDRAWAL_LIMIT');
    }
  `], {
    encoding: 'utf8', cwd: new URL('..', import.meta.url),
    env: { DOTENV_CONFIG_PATH: isolatedEnvPath, NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/casino_test', DIRECT_URL: 'postgresql://test:test@127.0.0.1:1/casino_test',
      JWT_ACCESS_SECRET: 'isolated-test-access-secret-minimum-32', JWT_REFRESH_SECRET: 'isolated-test-refresh-secret-minimum-32' },
  });
  assert.equal(result.status, 0, result.stderr);
});

test('Blackjack admite apuestas de 10 a 10000 y rechaza valores fuera del rango', () => {
  for (const apuesta of [10, 1000, 9999.99, 10000]) {
    assert.equal(blackjackStartDTO.safeParse({ apuesta }).success, true, String(apuesta));
  }
  for (const apuesta of [0, 9.99, 10000.01, 10001, 10.001, Infinity, NaN, '10000']) {
    assert.equal(blackjackStartDTO.safeParse({ apuesta }).success, false, String(apuesta));
  }
});

test('Blackjack rechaza más de 10000 en el servicio antes de conectar a la base de datos', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { iniciar } = await import('./src/modules/games/blackjack/blackjack.service.js');
    await assert.rejects(iniciar('sin-conexion', { apuesta: 10000.01 }),
      (error) => error.statusCode === 400 && /10000/.test(error.message));
  `], {
    encoding: 'utf8', cwd: new URL('..', import.meta.url),
    env: { DOTENV_CONFIG_PATH: isolatedEnvPath, NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/casino_test', DIRECT_URL: 'postgresql://test:test@127.0.0.1:1/casino_test',
      JWT_ACCESS_SECRET: 'isolated-test-access-secret-minimum-32', JWT_REFRESH_SECRET: 'isolated-test-refresh-secret-minimum-32' },
  });
  assert.equal(result.status, 0, result.stderr);
});

test('producción exige claves Stripe de test y rechaza claves live', () => {
  const base = {
    DOTENV_CONFIG_PATH: isolatedEnvPath,
    NODE_ENV: 'production', CORS_ORIGINS: 'https://example.com',
    DATABASE_URL: 'postgresql://test:test@localhost/casino_test', DIRECT_URL: 'postgresql://test:test@localhost/casino_test',
    JWT_ACCESS_SECRET: 'isolated-test-access-secret-minimum-32', JWT_REFRESH_SECRET: 'isolated-test-refresh-secret-minimum-32',
  };
  const casos = [
    [{}, 1],
    [{ STRIPE_SECRET_KEY: 'sk_test_dummy' }, 1],
    [{ STRIPE_SECRET_KEY: 'sk_live_rechazada', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' }, 1],
    [{ STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' }, 0],
  ];
  for (const [extra, expected] of casos) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config/env.js')"], {
      encoding: 'utf8', cwd: new URL('..', import.meta.url), env: { ...base, ...extra },
    });
    assert.equal(result.status, expected, result.stderr);
  }
});

test('bcrypt rechaza contraseñas Unicode que superan 72 bytes', () => {
  const password = '😀'.repeat(20);
  assert.equal(registerDTO.safeParse({ email: 'test@example.com', nombre: 'Test', password }).success, false);
  assert.equal(loginDTO.safeParse({ email: 'test@example.com', password }).success, false);
});

test('producción rechaza CORS comodín y acepta origen explícito', () => {
  for (const [CORS_ORIGINS, expected] of [['*', 1], ['https://example.com,*', 1], ['https://example.com', 0]]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config/env.js')"], {
      encoding: 'utf8', cwd: new URL('..', import.meta.url),
      env: { ...process.env, DOTENV_CONFIG_PATH: isolatedEnvPath, NODE_ENV: 'production', CORS_ORIGINS,
        DATABASE_URL: 'postgresql://test:test@localhost/casino_test', DIRECT_URL: 'postgresql://test:test@localhost/casino_test',
        JWT_ACCESS_SECRET: 'isolated-test-access-secret-minimum-32', JWT_REFRESH_SECRET: 'isolated-test-refresh-secret-minimum-32',
        STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' },
    });
    assert.equal(result.status, expected, result.stderr);
  }
});
