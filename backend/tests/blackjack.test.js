// Tests de lógica pura del motor Blackjack (sin DB).
// Verifican: evaluador de manos, ases flexibles, naturales y el shoe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShoe,
  handValue,
  cardValue,
  isNatural,
  shuffle,
} from '../src/shared/utils/cards.js';

test('shoe de 6 mazos: 312 cartas exactas', () => {
  const shoe = buildShoe(6);
  assert.equal(shoe.length, 6 * 52);
  // 6 de cada carta
  const copias = shoe.filter((c) => c === 'A♠').length;
  assert.equal(copias, 6);
});

test('shuffle no pierde ni duplica cartas', () => {
  const shoe = shuffle(buildShoe(1));
  assert.equal(shoe.length, 52);
  assert.equal(new Set(shoe).size, 52);
});

test('valores simples: figuras = 10', () => {
  assert.equal(cardValue('J♥'), 10);
  assert.equal(cardValue('Q♣'), 10);
  assert.equal(cardValue('K♦'), 10);
  assert.equal(cardValue('7♠'), 7);
  assert.equal(cardValue('10♥'), 10);
});

test('As flexible: 11 o 1 según convenga', () => {
  assert.equal(handValue(['A♠', '9♦']).total, 20);
  assert.equal(handValue(['A♠', 'A♦']).total, 12); // 11+11 → 11+1
  assert.equal(handValue(['A♠', 'K♦', '5♣']).total, 16); // 11+10+5 → 1+10+5
  assert.equal(handValue(['A♠', '6♦']).total, 17);
  assert.equal(handValue(['A♠', '6♦']).soft, true);
});

test('bust: más de 21', () => {
  assert.equal(handValue(['K♠', 'Q♦', '5♣']).total, 25);
  assert.equal(handValue(['A♠', '9♦', '5♣']).total, 15); // As baja a 1
});

test('blackjack natural: exactamente 2 cartas y 21', () => {
  assert.ok(isNatural(['A♠', 'K♦']));
  assert.ok(!isNatural(['A♠', '9♦', 'K♣']), '21 con 3 cartas NO es natural');
  assert.ok(!isNatural(['A♠', '10♦', 'K♣']));
});
