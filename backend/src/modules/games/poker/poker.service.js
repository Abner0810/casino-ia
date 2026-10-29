import { randomInt } from 'node:crypto';
import { userTransaction } from '../../../shared/transaction.js';
import { ApiError } from '../../../shared/ApiError.js';
import { debitar, acreditar } from '../../../shared/utils/ledger.js';
import { toDecimal, toNumber, dosDecimales } from '../../../shared/utils/money.js';
import { POKER_LIMITES, POKER_REGLAS } from './poker.config.js';
import { avanzarMesa, compararManos, evaluarMejorMano } from './poker.logic.js';
import * as repo from './poker.repository.js';

const RANGOS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const PALOS = ['♠', '♥', '♦', '♣'];

function baraja() {
  const cartas = RANGOS.flatMap((rango) => PALOS.map((palo) => `${rango}${palo}`));
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}

function leer(valor, nombre) {
  try {
    return typeof valor === 'string' ? JSON.parse(valor) : valor;
  } catch {
    throw new ApiError(409, `El estado de ${nombre} no es válido`);
  }
}

function estadoDe(partida) {
  const cartasJugador = leer(partida.cartas, 'la partida');
  const cartasBanca = leer(partida.banca, 'la partida');
  const comunitarias = leer(partida.comunitarias, 'la partida');
  const mazo = leer(partida.baraja, 'la partida');
  if (![cartasJugador, cartasBanca, comunitarias, mazo].every(Array.isArray)) {
    throw new ApiError(409, 'El estado de la partida no es válido');
  }
  return { cartasJugador, cartasBanca, comunitarias, baraja: mazo, fase: partida.fase ?? 'PREFLOP' };
}

function acciones(partida, estado, saldo) {
  if (partida.estado !== 'ACTIVA') return [];
  const total = toDecimal(partida.apuestaTotal);
  const base = toDecimal(partida.apuesta);
  const puedeSubir = total.add(base).lte(toDecimal(saldo)) && total.div(base).lt(POKER_LIMITES.MAX_SUBIDAS);
  return puedeSubir ? ['check', 'raise', 'fold'] : ['check', 'fold'];
}

function resumen(partida, estado, saldo) {
  const activa = partida.estado === 'ACTIVA';
  return {
    partidaId: partida.id,
    version: partida.version,
    estado: partida.estado,
    fase: partida.fase ?? estado.fase,
    cartasJugador: estado.cartasJugador,
    cartasBanca: activa ? ['🂠', '🂠'] : estado.cartasBanca,
    comunitarias: estado.comunitarias,
    apuestaBase: toNumber(partida.apuesta),
    apuestaTotal: toNumber(partida.apuestaTotal),
    bote: toNumber(toDecimal(partida.apuestaTotal).times(2)),
    accionesPermitidas: acciones(partida, estado, toNumber(saldo)),
    saldoActual: toNumber(saldo),
    resultado: partida.resultado,
  };
}

async function finalizar(tx, partida, estado, ganador, motivo = 'SHOWDOWN') {
  const jugador = evaluarMejorMano([...estado.cartasJugador, ...estado.comunitarias]);
  const banca = evaluarMejorMano([...estado.cartasBanca, ...estado.comunitarias]);
  const comparacion = compararManos(jugador, banca);
  const resultadoGanador = ganador ?? (comparacion > 0 ? 'JUGADOR' : comparacion < 0 ? 'BANCA' : 'EMPATE');
  let ganancia = toDecimal(0);
  if (resultadoGanador === 'JUGADOR') {
    ganancia = dosDecimales(toDecimal(partida.apuestaTotal).times(2));
    await acreditar(tx, partida.userId, ganancia, 'poker', 'Bote ganado en Poker');
  } else if (resultadoGanador === 'EMPATE') {
    ganancia = dosDecimales(toDecimal(partida.apuestaTotal));
    await acreditar(tx, partida.userId, ganancia, 'poker', 'Devolución por empate en Poker');
  }
  const estadoFinal = resultadoGanador === 'JUGADOR' ? 'GANADA' : resultadoGanador === 'EMPATE' ? 'EMPATE' : 'PERDIDA';
  const resultado = {
    ganador: resultadoGanador,
    motivo,
    manoJugador: jugador.mano,
    manoBanca: banca.mano,
    ganancia: toNumber(ganancia),
    gananciaNeta: toNumber(ganancia.minus(toDecimal(partida.apuestaTotal))),
  };
  return { estado: estadoFinal, resultado, jugador, banca };
}

export const configuracion = () => ({
  apuestaMinima: POKER_LIMITES.MIN,
  apuestaMaxima: POKER_LIMITES.MAX,
  maxSubidas: POKER_LIMITES.MAX_SUBIDAS,
  reglas: POKER_REGLAS,
});

export async function iniciar(userId, { apuesta }) {
  if (apuesta < POKER_LIMITES.MIN || apuesta > POKER_LIMITES.MAX) throw new ApiError(400, 'La apuesta está fuera de los límites de Poker');
  return userTransaction(userId, async (tx) => {
    if (await repo.buscarActiva(tx, userId)) throw new ApiError(409, 'Ya tienes una partida de Poker activa');
    const mazo = baraja();
    const cartasJugador = [mazo.pop(), mazo.pop()];
    const cartasBanca = [mazo.pop(), mazo.pop()];
    const partida = await repo.crearPartida(tx, {
      userId, apuesta: dosDecimales(toDecimal(apuesta)), apuestaTotal: dosDecimales(toDecimal(apuesta)),
      modalidad: 'TEXAS_HOLDEM', fase: 'PREFLOP', cartas: cartasJugador, banca: cartasBanca,
      comunitarias: [], baraja: mazo, ganancia: 0,
    });
    await debitar(tx, userId, toDecimal(apuesta), 'poker', 'Apuesta inicial de Poker');
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return resumen(partida, estadoDe(partida), wallet.saldo);
  });
}

export async function actuar(userId, partidaId, { version, accion }) {
  return userTransaction(userId, async (tx) => {
    await repo.bloquearPartida(tx, userId, partidaId);
    const partida = await repo.buscarPropia(tx, userId, partidaId);
    if (!partida) throw new ApiError(404, 'Partida no encontrada');
    if (partida.version !== version) throw new ApiError(409, 'La partida cambió. Consulta su estado actual.', undefined, 'STALE_VERSION');
    if (partida.estado !== 'ACTIVA') throw new ApiError(409, 'La partida ya terminó');
    const estado = estadoDe(partida);
    if (!['check', 'raise', 'fold'].includes(accion)) throw new ApiError(400, 'Acción de Poker no válida');
    if (accion === 'raise') await debitar(tx, userId, partida.apuesta, 'poker', 'Subida en Poker');
    let siguiente = estado;
    if (accion === 'fold') {
      siguiente = { ...estado, fase: 'SHOWDOWN' };
      const resultado = {
        ganador: 'BANCA', motivo: 'RETIRO', manoJugador: null, manoBanca: null,
        ganancia: 0, gananciaNeta: toNumber(toDecimal(partida.apuestaTotal).negated()),
      };
      const actualizado = await repo.guardarPartida(tx, partida.id, {
        estado: 'PERDIDA', fase: 'SHOWDOWN', resultado, ganancia: 0,
      });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      return resumen(actualizado, siguiente, wallet.saldo);
    }
    if (accion === 'raise') partida.apuestaTotal = partida.apuestaTotal.add(partida.apuesta);
    const avance = avanzarMesa(estado.fase, estado.baraja, estado.comunitarias);
    siguiente = { ...estado, ...avance };
    const ultima = avance.fase === 'RIVER';
    const cambios = { fase: avance.fase, cartas: estado.cartasJugador, banca: estado.cartasBanca, comunitarias: avance.comunitarias, baraja: avance.baraja };
    if (accion === 'raise') cambios.apuestaTotal = { increment: partida.apuesta };
    if (ultima) {
      const final = await finalizar(tx, { ...partida, apuestaTotal: accion === 'raise' ? partida.apuestaTotal : partida.apuestaTotal }, siguiente);
      cambios.estado = final.estado; cambios.fase = 'SHOWDOWN'; cambios.resultado = final.resultado; cambios.ganancia = final.resultado.ganancia;
      siguiente.fase = 'SHOWDOWN';
    }
    const actualizado = await repo.guardarPartida(tx, partida.id, cambios);
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return resumen(actualizado, siguiente, wallet.saldo);
  });
}

export async function consultar(userId, id) {
  return userTransaction(userId, async (tx) => {
    const partida = await repo.buscarPropia(tx, userId, id);
    if (!partida) throw new ApiError(404, 'Partida no encontrada');
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return resumen(partida, estadoDe(partida), wallet.saldo);
  });
}

export async function activa(userId) {
  return userTransaction(userId, async (tx) => {
    const partida = await repo.buscarActiva(tx, userId);
    if (!partida) return { partida: null };
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return { partida: resumen(partida, estadoDe(partida), wallet.saldo) };
  });
}

export async function ultimasPartidas(userId) {
  const partidas = await repo.partidasDeUsuario(userId);
  return partidas.map((partida) => {
    const resultado = partida.resultado ?? {};
    return {
      id: partida.id, apuesta: toNumber(partida.apuesta), apuestaTotal: toNumber(partida.apuestaTotal),
      bote: toNumber(toDecimal(partida.apuestaTotal).times(2)), estado: partida.estado, fase: partida.fase,
      manoJugador: resultado.manoJugador ?? null, manoBanca: resultado.manoBanca ?? null,
      ganancia: toNumber(partida.ganancia), creadaEn: partida.createdAt, cerradaEn: partida.finishedAt,
    };
  });
}
