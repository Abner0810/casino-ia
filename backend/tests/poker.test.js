import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarMano, cambiarCartas } from '../src/modules/games/poker/poker.logic.js';

test('video póker clasifica premios Jacks or Better sin confundir as bajo', () => {
  const casos = [
    [['10♠', 'J♠', 'Q♠', 'K♠', 'A♠'], 800],
    [['A♠', '2♠', '3♠', '4♠', '5♠'], 50],
    [['9♠', '9♥', '9♦', '9♣', '2♠'], 25],
    [['9♠', '9♥', '9♦', '2♣', '2♠'], 9],
    [['2♠', '5♠', '7♠', 'J♠', 'K♠'], 6],
    [['A♠', '2♥', '3♦', '4♣', '5♠'], 4],
    [['3♠', '3♥', '3♦', '9♣', 'K♠'], 3],
    [['3♠', '3♥', '9♦', '9♣', 'K♠'], 2],
    [['J♠', 'J♥', '2♦', '9♣', 'K♠'], 1],
    [['10♠', '10♥', '2♦', '9♣', 'K♠'], 0],
  ];
  for (const [cartas, multiplicador] of casos) assert.equal(evaluarMano(cartas).multiplicador, multiplicador, cartas.join(','));
});

test('conservar usa índices de 0 a 4 y reemplaza sin repetir cartas', () => {
  const inicial = ['A♠', '2♥', '3♦', '4♣', '5♠'];
  const baraja = ['K♠', 'Q♥', 'J♦', '10♣', '9♠'];
  assert.deepEqual(cambiarCartas(inicial, baraja, [0, 2]), ['A♠', 'K♠', '3♦', 'Q♥', 'J♦']);
  assert.throws(() => cambiarCartas(inicial, baraja, [0, 0]));
  assert.throws(() => cambiarCartas(inicial, baraja, [5]));
});
