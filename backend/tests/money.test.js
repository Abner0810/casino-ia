import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDecimal, toNumber, dosDecimales } from '../src/shared/utils/money.js';
import { depositDTO, withdrawDTO } from '../src/modules/transactions/dto/transaction.dto.js';
import { registerDTO, loginDTO } from '../src/modules/auth/dto/auth.dto.js';
import { spawnSync } from 'node:child_process';

test('dinero conserva centavos al sumar y redondear premios', () => {
  assert.equal(toNumber(toDecimal('0.1').add('0.2')), 0.3);
  assert.equal(dosDecimales('1.235').toString(), '1.24');
});

for (const [name, dto] of [['deposit', depositDTO], ['withdraw', withdrawDTO]]) {
  test(`${name} rechaza montos negativos, cero, fracciones extra y fuera de límite`, () => {
    for (const monto of [-1, 0, 0.001, 1_000_001, Infinity, NaN, '10']) {
      assert.equal(dto.safeParse({ monto }).success, false, String(monto));
    }
    for (const monto of [0.01, 10.25, 1_000_000]) {
      assert.equal(dto.safeParse({ monto }).success, true, String(monto));
    }
  });
}

test('bcrypt rechaza contraseñas Unicode que superan 72 bytes', () => {
  const password = '😀'.repeat(20);
  assert.equal(registerDTO.safeParse({ email: 'test@example.com', nombre: 'Test', password }).success, false);
  assert.equal(loginDTO.safeParse({ email: 'test@example.com', password }).success, false);
});

test('producción rechaza CORS comodín y acepta origen explícito', () => {
  for (const [CORS_ORIGINS, expected] of [['*', 1], ['https://example.com,*', 1], ['https://example.com', 0]]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config/env.js')"], {
      encoding: 'utf8', cwd: new URL('..', import.meta.url),
      env: { ...process.env, NODE_ENV: 'production', CORS_ORIGINS,
        DATABASE_URL: 'postgresql://test:test@localhost/casino_test', DIRECT_URL: 'postgresql://test:test@localhost/casino_test',
        JWT_ACCESS_SECRET: 'isolated-test-access-secret-minimum-32', JWT_REFRESH_SECRET: 'isolated-test-refresh-secret-minimum-32' },
    });
    assert.equal(result.status, expected, result.stderr);
  }
});
