// Tests de lógica pura del motor Plinko (sin DB).
// Verifican: RNG reproducible desde la seed, unbiased, EV con ventaja
// de la casa y límites de apuesta por riesgo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'crypto';
import { simularRuta } from '../src/modules/games/plinko/plinko.service.js';
import { PLINKO_RIESGOS, PLINKO_FILAS } from '../src/modules/games/plinko/plinko.config.js';

test('la ruta es reproducible desde la misma seed (auditoría)', () => {
  const seed = randomBytes(32).toString('hex');
  const a = simularRuta(seed);
  const b = simularRuta(seed);
  assert.deepEqual(a, b, 'misma seed ⇒ misma ruta y mismo slot');
});

test('seeds distintas producen rutas válidas (9 filas, slot 0..9)', () => {
  for (let i = 0; i < 200; i++) {
    const seed = randomBytes(32).toString('hex');
    const { ruta, indice } = simularRuta(seed);
    assert.equal(ruta.length, PLINKO_FILAS);
    assert.ok(ruta.every((p) => p === 'I' || p === 'D'));
    assert.ok(indice >= 0 && indice <= PLINKO_FILAS);
  }
});

test('la distribución de slots es aproximadamente binomial (sin sesgo)', () => {
  const N = 50_000;
  const conteo = new Array(PLINKO_FILAS + 1).fill(0);
  for (let i = 0; i < N; i++) {
    const seed = createHash('sha256').update(String(i)).digest('hex');
    conteo[simularRuta(seed).indice]++;
  }
  // El slot central (4-5) debe ser mucho más frecuente que los extremos
  assert.ok(conteo[4] + conteo[5] > conteo[0] + conteo[9],
    'los slots centrales deben ser más frecuentes que los extremos');
  // Cada slot interior debe haber aparecido (mínimo 1% para los de peso)
  for (const idx of [2, 3, 4, 5, 6, 7]) {
    assert.ok(conteo[idx] / N > 0.01, `slot ${idx} aparece al menos 1%`);
  }
});

test('todos los riesgos tienen ventaja de la casa (EV < 1) y 10 slots', () => {
  const combinatoria = [1, 9, 36, 84, 126, 126, 84, 36, 9, 1]; // C(9,k)
  for (const [riesgo, cfg] of Object.entries(PLINKO_RIESGOS)) {
    assert.equal(cfg.multiplicadores.length, PLINKO_FILAS + 1);
    const ev = cfg.multiplicadores.reduce((acc, m, k) => acc + m * combinatoria[k], 0) / 512;
    assert.ok(ev > 0.9 && ev < 1, `${riesgo}: EV=${ev.toFixed(3)} debe estar entre 0.9 y 1.0 (ventaja 0-10%)`);
    assert.ok(cfg.min < cfg.max, `${riesgo}: rango de apuesta válido`);
  }
});
