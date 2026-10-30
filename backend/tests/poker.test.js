import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarMano, cambiarCartas, resolverShowdown, calcularRepartoBote } from '../src/modules/games/poker/poker.logic.js';
import { evaluarRetiradasBots, responderBotsALaSubida, resumen } from '../src/modules/games/poker/poker.service.js';

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

test('Texas Holdem devuelve todos los ganadores cuando las comunitarias empatan a la mesa', () => {
  const comunitarias = ['10♠', 'J♠', 'Q♠', 'K♠', 'A♠'];
  const manos = [['2♣', '3♦'], ['4♣', '5♦'], ['6♣', '7♦'], ['8♣', '9♦']];
  assert.deepEqual(resolverShowdown(manos, comunitarias).ganadores, [0, 1, 2, 3]);
});

test('Texas Holdem elige el ganador a partir de las cartas privadas', () => {
  const comunitarias = ['A♠', 'K♥', '8♦', '4♣', '2♠'];
  const manos = [['A♥', 'Q♣'], ['K♦', 'J♣'], ['8♥', '7♣'], ['3♥', '3♦']];
  assert.deepEqual(resolverShowdown(manos, comunitarias).ganadores, [0]);
});

test('Texas Holdem agrupa cuatro aportes y divide el bote entre usuario y bot empatados', () => {
  assert.deepEqual(calcularRepartoBote(10, [10, 10, 10], [0]), { bote: 40, premioJugador: 40 });
  assert.deepEqual(calcularRepartoBote(10, [10, 10, 10], [0, 2]), { bote: 40, premioJugador: 20 });
  assert.deepEqual(calcularRepartoBote(10, [10, 10, 10], [1, 3]), { bote: 40, premioJugador: 0 });
});

test('mesa activa expone cuatro puestos y nunca las cartas privadas de los bots', () => {
  const partida = {
    id: 'partida', version: 0, estado: 'ACTIVA', fase: 'PREFLOP', apuesta: 10, apuestaTotal: 10,
    resultado: { bots: [{ retirado: false, apuesta: 10 }, { retirado: false, apuesta: 10 }, { retirado: false, apuesta: 10 }] },
  };
  const estado = {
    cartasJugador: ['A♠', 'K♠'], cartasBots: [['2♣', '3♣'], ['4♦', '5♦'], ['6♥', '7♥']], comunitarias: [],
    estadoBots: partida.resultado.bots, fase: 'PREFLOP',
  };
  const mesa = resumen(partida, estado, 90);
  assert.equal(mesa.jugadores.length, 4);
  assert.deepEqual(mesa.jugadores.slice(1).map((jugador) => jugador.cartas), [null, null, null]);
  assert.equal(mesa.bote, 40);
  assert.equal(mesa.turnoActual, 'JUGADOR');
});

test('bot que foldea al raise no aporta; quien iguala conserva la apuesta si foldea en la siguiente calle', () => {
  const estados = [
    { retirado: false, apuesta: 10 },
    { retirado: false, apuesta: 10 },
    { retirado: true, apuesta: 10 },
  ];
  const manos = [['2♣', '3♦'], ['9♣', '8♦'], ['A♠', 'A♥']];
  const trasRespuesta = responderBotsALaSubida(estados, manos, [], 'PREFLOP', 10);
  assert.deepEqual(trasRespuesta, [
    { retirado: true, apuesta: 10 },
    { retirado: false, apuesta: 20 },
    { retirado: true, apuesta: 10 },
  ]);
  const trasFlop = evaluarRetiradasBots(trasRespuesta, manos, ['2♠', '3♥', '4♣'], 'FLOP');
  assert.deepEqual(trasFlop[1], { retirado: true, apuesta: 20 });
});
