// SERVICIO BLACKJACK
//
// Estado de la partida 100% server-side en JSONB (baraja restante,
// manos, crupier): el cliente solo recibe un resumen con una carta del
// crupier oculta. El estado vive en la DB, así que un reinicio del dyno
// en Render no rompe partidas activas.
//
// Reglas implementadas (blackjack.config.js):
//  - Shoe de 6 mazos (312 cartas) barajado con CSPRNG.
//  - Crupier planta en todos los 17. Blackjack natural paga 3:2.
//  - Split de pares del mismo valor hasta 3 manos; ases reciben 1 carta
//    y quedan plantados (regla estándar de Vegas).
//  - Double ("subir la apuesta"): solo con 2 cartas iniciales, descuenta
//    la apuesta extra, recibe 1 carta y planta.
//  - Exit (rendición): devuelve el 50% de la apuesta total.
//
// Atomicidad: cada acción es UNA $transaction — dinero (ledger) y estado
// de la partida se confirman juntos o revierten juntos. Toda mutación de
// saldo genera su fila en Movimiento.

import { prisma } from '../../../shared/prisma.client.js';
import { ApiError } from '../../../shared/ApiError.js';
import { buildShoe, handValue, isNatural, cardValue } from '../../../shared/utils/cards.js';
import { toDecimal, toNumber, dosDecimales } from '../../../shared/utils/money.js';
import { debitar, acreditar } from '../../../shared/utils/ledger.js';
import { BLACKJACK_LIMITES, REGLAS } from './blackjack.config.js';
import * as repo from './blackjack.repository.js';

// ─────────────────────── helpers puros del motor ───────────────────────

const robarCarta = (state) => state.baraja.pop();

function jugarCrupier(state) {
  while (handValue(state.dealer.cartas).total < REGLAS.EL_CRUPIER_PLANTA_EN) {
    state.dealer.cartas.push(robarCarta(state));
  }
}

const esBlackjackNatural = (mano) =>
  !mano.dividida && !mano.doblada && mano.cartas.length === 2 && handValue(mano.cartas).total === 21;

const factorDePago = (mano) =>
  esBlackjackNatural(mano) ? REGLAS.PAGO_BLACKJACK_NATURAL : REGLAS.PAGO_VICTORIA_NORMAL;

// Resumen seguro para el cliente: una carta del crupier oculta salvo que
// la partida haya terminado.
function resumen(state, partida, mostrarCrupierCompleto = false) {
  const dealerVisibles = mostrarCrupierCompleto
    ? state.dealer.cartas
    : [state.dealer.cartas[0], '🂠'];
  const dealerTotal = mostrarCrupierCompleto
    ? handValue(state.dealer.cartas).total
    : cardValue(state.dealer.cartas[0]);

  return {
    partidaId: partida.id,
    estado: partida.estado,
    apuestaBase: toNumber(partida.apuesta),
    apuestaTotal: toNumber(state.manos.reduce((acc, m) => acc.plus(toDecimal(m.apuesta)), toDecimal(0))),
    dealer: { cartas: dealerVisibles, totalVisible: dealerTotal },
    manos: state.manos.map((m) => ({
      cartas: m.cartas,
      valor: handValue(m.cartas).total,
      apuesta: toNumber(m.apuesta),
      estado: m.estado,
      ganancia: m.ganancia ?? null,
    })),
    cartasRestantes: state.baraja.length,
  };
}

// Evalúa naturales al reparte. Devuelve el estado final o null si la
// partida continúa.
function evaluarNaturales(state) {
  const jugadorNatural = isNatural(state.manos[0].cartas);
  const crupierNatural = isNatural(state.dealer.cartas);
  if (!jugadorNatural && !crupierNatural) return null;
  if (jugadorNatural && crupierNatural) state.manos[0].estado = 'EMPATE';
  else if (jugadorNatural) state.manos[0].estado = 'GANADA';
  else state.manos[0].estado = 'PERDIDA';
  return 'NATURAL';
}

// Cuando ninguna mano queda ACTIVA: el crupier juega (solo si alguien se
// plantó) y se comparan resultados acreditando premios.
async function cerrarPartida(tx, partida, state) {
  if (state.manos.some((m) => m.estado === 'ACTIVA')) return false;

  const hayManoParaComparar = state.manos.some((m) => m.estado === 'PLANTADO');
  if (hayManoParaComparar) jugarCrupier(state);
  const dealerTotal = handValue(state.dealer.cartas).total;

  for (const mano of state.manos) {
    if (mano.estado !== 'PLANTADO') continue; // las PERDIDA (bust) ya quedaron
    const total = handValue(mano.cartas).total;
    if (dealerTotal > 21 || total > dealerTotal) {
      mano.estado = 'GANADA';
      const premio = dosDecimales(toDecimal(mano.apuesta).times(factorDePago(mano)));
      mano.ganancia = toNumber(premio);
      await acreditar(
        tx,
        partida.userId,
        premio,
        'blackjack',
        `Premio Blackjack: ${total} vs crupier ${dealerTotal}${esBlackjackNatural(mano) ? ' (blackjack natural 3:2)' : ''}`
      );
    } else if (total === dealerTotal) {
      mano.estado = 'EMPATE';
      const devolucion = dosDecimales(toDecimal(mano.apuesta));
      mano.ganancia = toNumber(devolucion);
      await acreditar(
        tx,
        partida.userId,
        devolucion,
        'blackjack',
        `Empate Blackjack ${total}-${dealerTotal}: devolución de apuesta`
      );
    } else {
      mano.estado = 'PERDIDA';
      mano.ganancia = 0;
    }
  }

  const estados = state.manos.map((m) => m.estado);
  if (estados.every((e) => e === 'PERDIDA')) return 'PERDIDA';
  if (estados.some((e) => e === 'GANADA')) return 'GANADA';
  return 'EMPATE';
}

function datosResultado(state) {
  return {
    dealer: { cartas: state.dealer.cartas, total: handValue(state.dealer.cartas).total },
    manos: state.manos.map((m) => ({
      cartas: m.cartas,
      valor: handValue(m.cartas).total,
      apuesta: toNumber(m.apuesta),
      estado: m.estado,
      ganancia: m.ganancia ?? 0,
    })),
  };
}

function validarLimites(apuesta) {
  if (apuesta < BLACKJACK_LIMITES.MIN || apuesta > BLACKJACK_LIMITES.MAX) {
    throw new ApiError(
      400,
      `La apuesta debe estar entre ${BLACKJACK_LIMITES.MIN} y ${BLACKJACK_LIMITES.MAX}`
    );
  }
}

const estadoDe = (partida) => {
  try {
    return typeof partida.manos === 'string' ? JSON.parse(partida.manos) : partida.manos;
  } catch {
    return null;
  }
};

// ─────────────────────────── acciones ───────────────────────────

export async function iniciar(userId, { apuesta }) {
  validarLimites(apuesta);
  const montoApuesta = dosDecimales(toDecimal(apuesta));

  return prisma.$transaction(async (tx) => {
    const saldoFinal = await debitar(
      tx,
      userId,
      montoApuesta,
      'blackjack',
      'Apuesta inicial Blackjack'
    );

    const state = {
      baraja: buildShoe(6),
      dealer: { cartas: [] },
      manos: [{ cartas: [], apuesta: toNumber(montoApuesta), estado: 'ACTIVA', doblada: false, dividida: false, ganancia: null }],
    };
    // Reparte 2+2
    for (let i = 0; i < 2; i++) {
      state.manos[0].cartas.push(robarCarta(state));
      state.dealer.cartas.push(robarCarta(state));
    }

    const partida = await repo.crearPartida(tx, {
      userId,
      apuesta: montoApuesta,
      estado: 'ACTIVA',
      baraja: state.baraja,
      dealer: state.dealer,
      manos: state.manos,
    });

    // Naturales: la partida puede terminar en la misma transacción
    const estadoNatural = evaluarNaturales(state);
    if (estadoNatural) {
      const mano = state.manos[0];
      if (mano.estado === 'GANADA') {
        const premio = dosDecimales(toDecimal(mano.apuesta).times(REGLAS.PAGO_BLACKJACK_NATURAL));
        mano.ganancia = toNumber(premio);
        await acreditar(tx, userId, premio, 'blackjack', '¡Blackjack natural! Pago 3:2');
      } else if (mano.estado === 'EMPATE') {
        const devolucion = dosDecimales(toDecimal(mano.apuesta));
        mano.ganancia = toNumber(devolucion);
        await acreditar(tx, userId, devolucion, 'blackjack', 'Empate con blackjack del crupier: devolución');
      }
      const estadoFinal = mano.estado; // GANADA | EMPATE | PERDIDA
      await repo.guardarPartida(tx, partida.id, {
        estado: estadoFinal,
        baraja: state.baraja,
        dealer: state.dealer,
        manos: state.manos,
        resultado: datosResultado(state),
        finishedAt: new Date(),
      });
      partida.estado = estadoFinal;
    }

    return {
      ...resumen(state, partida, Boolean(estadoNatural)),
      saldoActual: toNumber(saldoFinal),
      mensaje: estadoNatural
        ? 'Blackjack en la apertura, partida resuelta'
        : 'Partida iniciada. Elige: hit, stand, split, double o exit',
    };
  });
}

// Acción genérica sobre la mano ACTIVA actual (hit/stand comparten flujo)
async function accion(userId, partidaId, tipo) {
  return prisma.$transaction(async (tx) => {
    const partida = await repo.partidaActiva(tx, partidaId, userId);
    if (!partida) throw new ApiError(404, 'Partida no encontrada o ya finalizada');

    const state = estadoDe(partida);
    const mano = state.manos.find((m) => m.estado === 'ACTIVA');
    if (!mano) throw new ApiError(400, 'No hay una mano activa en esta partida');

    if (tipo === 'hit') {
      mano.cartas.push(robarCarta(state));
      if (handValue(mano.cartas).total > 21) {
        mano.estado = 'PERDIDA';
        mano.ganancia = 0;
      }
    } else {
      // stand
      mano.estado = 'PLANTADO';
    }

    const estadoFinal = await cerrarPartida(tx, partida, state);
    await repo.guardarPartida(tx, partida.id, {
      baraja: state.baraja,
      dealer: state.dealer,
      manos: state.manos,
      ...(estadoFinal
        ? { estado: estadoFinal, resultado: datosResultado(state), finishedAt: new Date() }
        : {}),
    });
    partida.estado = estadoFinal ?? 'ACTIVA';

    return resumen(state, partida, Boolean(estadoFinal));
  });
}

export const pedirCarta = (userId, partidaId) => accion(userId, partidaId, 'hit');
export const plantarse = (userId, partidaId) => accion(userId, partidaId, 'stand');

// "Subir la apuesta" = doblar: solo con 2 cartas iniciales y saldo para
// igualar la apuesta de esa mano. Recibe exactamente 1 carta y planta.
export async function doblar(userId, partidaId) {
  return prisma.$transaction(async (tx) => {
    const partida = await repo.partidaActiva(tx, partidaId, userId);
    if (!partida) throw new ApiError(404, 'Partida no encontrada o ya finalizada');

    const state = estadoDe(partida);
    const mano = state.manos.find((m) => m.estado === 'ACTIVA');
    if (!mano) throw new ApiError(400, 'No hay una mano activa en esta partida');
    if (mano.cartas.length !== 2 || mano.doblada) {
      throw new ApiError(400, 'Solo puedes doblar con exactamente 2 cartas iniciales');
    }

    await debitar(tx, userId, toDecimal(mano.apuesta), 'blackjack', 'Doble apuesta Blackjack');
    mano.apuesta = toNumber(toDecimal(mano.apuesta).times(2));
    mano.doblada = true;
    mano.cartas.push(robarCarta(state));
    if (handValue(mano.cartas).total > 21) {
      mano.estado = 'PERDIDA';
      mano.ganancia = 0;
    } else {
      mano.estado = 'PLANTADO';
    }

    const estadoFinal = await cerrarPartida(tx, partida, state);
    await repo.guardarPartida(tx, partida.id, {
      baraja: state.baraja,
      dealer: state.dealer,
      manos: state.manos,
      ...(estadoFinal
        ? { estado: estadoFinal, resultado: datosResultado(state), finishedAt: new Date() }
        : {}),
    });
    partida.estado = estadoFinal ?? 'ACTIVA';

    return { ...resumen(state, partida, Boolean(estadoFinal)), mensaje: 'Apuesta doblada + 1 carta' };
  });
}

// Split: par del mismo valor, saldo para igualar, hasta 3 manos.
// Ases: cada mano recibe 1 carta y queda plantada (regla de Vegas).
export async function dividir(userId, partidaId) {
  return prisma.$transaction(async (tx) => {
    const partida = await repo.partidaActiva(tx, partidaId, userId);
    if (!partida) throw new ApiError(404, 'Partida no encontrada o ya finalizada');

    const state = estadoDe(partida);
    const mano = state.manos.find((m) => m.estado === 'ACTIVA');
    if (!mano) throw new ApiError(400, 'No hay una mano activa en esta partida');
    if (mano.cartas.length !== 2 || mano.doblada || mano.dividida) {
      throw new ApiError(400, 'Solo puedes dividir tu primera mano con exactamente 2 cartas');
    }
    if (state.manos.length >= REGLAS.MAX_MANOS_POR_SPLIT) {
      throw new ApiError(400, `Máximo ${REGLAS.MAX_MANOS_POR_SPLIT} manos por partida`);
    }
    const [c1, c2] = mano.cartas;
    if (cardValue(c1) !== cardValue(c2)) {
      throw new ApiError(400, 'Solo puedes dividir cartas del mismo valor');
    }

    // Igualar la apuesta con dinero real (ledger)
    await debitar(tx, userId, toDecimal(mano.apuesta), 'blackjack', 'Apuesta para mano dividida (split)');

    const esAs = c1.startsWith('A');
    const mano2 = {
      cartas: [c2],
      apuesta: mano.apuesta,
      estado: 'ACTIVA',
      doblada: false,
      dividida: true,
      ganancia: null,
    };
    mano.cartas = [c1];
    mano.dividida = true;
    state.manos.push(mano2);

    // Ambas manos reciben 1 carta
    mano.cartas.push(robarCarta(state));
    mano2.cartas.push(robarCarta(state));

    if (esAs) {
      // Regla de Vegas: ases separados → 1 carta por mano y plantar
      mano.estado = 'PLANTADO';
      mano2.estado = 'PLANTADO';
    }

    const estadoFinal = await cerrarPartida(tx, partida, state);
    await repo.guardarPartida(tx, partida.id, {
      baraja: state.baraja,
      dealer: state.dealer,
      manos: state.manos,
      ...(estadoFinal
        ? { estado: estadoFinal, resultado: datosResultado(state), finishedAt: new Date() }
        : {}),
    });
    partida.estado = estadoFinal ?? 'ACTIVA';

    return {
      ...resumen(state, partida, Boolean(estadoFinal)),
      mensaje: esAs ? 'Ases divididos: 1 carta por mano y plantadas' : 'Mano dividida, sigue jugando',
    };
  });
}

// "Salir" de la mesa = rendición: recupera el 50% de la apuesta total
export async function salir(userId, partidaId) {
  return prisma.$transaction(async (tx) => {
    const partida = await repo.partidaActiva(tx, partidaId, userId);
    if (!partida) throw new ApiError(404, 'Partida no encontrada o ya finalizada');

    const state = estadoDe(partida);
    const apuestaTotal = state.manos.reduce((acc, m) => acc.plus(toDecimal(m.apuesta)), toDecimal(0));
    const devolucion = dosDecimales(apuestaTotal.times(REGLAS.RENDICION));

    for (const mano of state.manos) {
      if (mano.estado === 'ACTIVA') {
        mano.estado = 'RENDIDA';
        mano.ganancia = 0;
      }
    }

    const saldoFinal = await acreditar(
      tx,
      userId,
      devolucion,
      'blackjack',
      `Rendición Blackjack: devolución del 50% de ${toNumber(apuestaTotal)}`
    );

    await repo.guardarPartida(tx, partida.id, {
      estado: 'RENDIDA',
      baraja: state.baraja,
      dealer: state.dealer,
      manos: state.manos,
      resultado: datosResultado(state),
      finishedAt: new Date(),
    });

    return {
      ...resumen(state, { ...partida, estado: 'RENDIDA' }, false),
      devuelto: toNumber(devolucion),
      saldoActual: toNumber(saldoFinal),
      mensaje: 'Te retiraste de la mesa: se devolvió el 50% de la apuesta',
    };
  });
}

export async function ultimasPartidas(userId) {
  const partidas = await repo.partidasDeUsuario(userId);
  return partidas.map((p) => ({
    id: p.id,
    apuesta: toNumber(p.apuesta),
    estado: p.estado,
    resultado: p.resultado,
    creadaEn: p.createdAt,
    cerradaEn: p.finishedAt,
  }));
}
