// Utilidades del mazo de blackjack. La fuente de entropía es siempre
// crypto.randomInt del runtime de Node (CSPRNG), nunca Math.random.

import { randomInt } from 'crypto';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

// Fisher-Yates criptográfico
export function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Shoe de 6 mazos (312 cartas) barajado
export function buildShoe(decks = 6) {
  const shoe = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push(`${rank}${suit}`);
      }
    }
  }
  return shuffle(shoe);
}

// Valor de una carta: figuras = 10, As = 11 (se ajusta en handValue)
export function cardValue(card) {
  const rank = card.slice(0, -1);
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

// Total de una mano con As flexible (11 → 1 si me pasa de 21)
export function handValue(cards) {
  let total = 0;
  let ases = 0;
  for (const card of cards) {
    total += cardValue(card);
    if (card.startsWith('A')) ases++;
  }
  while (total > 21 && ases > 0) {
    total -= 10;
    ases--;
  }
  return { total, soft: ases > 0 };
}

// Blackjack natural: 2 cartas y exactamente 21 (paga 3:2)
export function isNatural(cards) {
  return cards.length === 2 && handValue(cards).total === 21;
}
