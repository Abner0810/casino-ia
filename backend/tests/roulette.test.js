import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorDe, pagoDe } from '../src/modules/games/roulette/roulette.logic.js';

test('ruleta europea tiene un cero verde y 18 rojos, 18 negros', () => {
  const colores = Array.from({ length: 37 }, (_, n) => colorDe(n));
  assert.equal(colores.filter((v) => v === 'verde').length, 1);
  assert.equal(colores.filter((v) => v === 'rojo').length, 18);
  assert.equal(colores.filter((v) => v === 'negro').length, 18);
});

test('cero pierde apuestas externas; cada apuesta paga el retorno bruto correcto', () => {
  for (const [tipo, seleccion, total, pago] of [
    ['pleno', 17, 1, 36], ['color', 'rojo', 18, 2], ['paridad', 'par', 18, 2],
    ['docena', 2, 12, 3], ['columna', 3, 12, 3],
  ]) {
    const ganadores = Array.from({ length: 37 }, (_, n) => pagoDe(n, tipo, seleccion)).filter((v) => v > 0);
    assert.equal(ganadores.length, total, tipo);
    assert.ok(ganadores.every((v) => v === pago));
  }
  for (const tipo of ['color', 'paridad', 'docena', 'columna']) assert.equal(pagoDe(0, tipo, tipo === 'color' ? 'rojo' : 1), 0);
});
