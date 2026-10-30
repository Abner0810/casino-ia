import { randomInt } from 'node:crypto';
import { userTransaction } from '../../../shared/transaction.js';
import { ApiError } from '../../../shared/ApiError.js';
import { debitar, acreditar } from '../../../shared/utils/ledger.js';
import { toDecimal, toNumber, dosDecimales } from '../../../shared/utils/money.js';
import { POKER_BOTS, POKER_LIMITES, POKER_NOMBRES_BOTS, POKER_REGLAS } from './poker.config.js';
import { avanzarMesa, calcularRepartoBote, compararManos, resolverShowdown } from './poker.logic.js';
import * as repo from './poker.repository.js';

const RANGOS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const PALOS = ['♠', '♥', '♦', '♣'];
const OCULTA = '🂠';
const valores = { A: 14, K: 13, Q: 12, J: 11 };

function elegirNombresBots() {
  const nombres = [...POKER_NOMBRES_BOTS];
  for (let indice = 0; indice < POKER_BOTS.length; indice++) {
    const elegido = indice + randomInt(nombres.length - indice);
    [nombres[indice], nombres[elegido]] = [nombres[elegido], nombres[indice]];
  }
  return nombres.slice(0, POKER_BOTS.length);
}

function baraja() {
  const cartas = RANGOS.flatMap((rango) => PALOS.map((palo) => `${rango}${palo}`));
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}

function leer(valor, nombre) {
  try { return typeof valor === 'string' ? JSON.parse(valor) : valor; }
  catch { throw new ApiError(409, `El estado de ${nombre} no es válido`); }
}

function estadoDe(partida) {
  const cartasJugador = leer(partida.cartas, 'la partida');
  const bancaGuardada = leer(partida.banca, 'la partida');
  const comunitarias = leer(partida.comunitarias, 'la partida');
  const mazo = leer(partida.baraja, 'la partida');
  if (![cartasJugador, bancaGuardada, comunitarias, mazo].every(Array.isArray)) throw new ApiError(409, 'El estado de la partida no es válido');
  // Las partidas activas previas a la mesa de bots tenían una sola mano rival.
  const cartasBots = typeof bancaGuardada[0] === 'string' ? [bancaGuardada] : bancaGuardada;
  while (cartasBots.length < POKER_BOTS.length) cartasBots.push([mazo.pop(), mazo.pop()]);
  if (cartasBots.length !== POKER_BOTS.length || cartasBots.some((mano) => !Array.isArray(mano) || mano.length !== 2)) {
    throw new ApiError(409, 'Las cartas privadas de la mesa no son válidas');
  }
  const estadoBotsGuardado = partida.resultado?.bots ?? POKER_BOTS.map(() => ({ retirado: false, apuesta: toNumber(partida.apuestaTotal) }));
  const estadoBots = Array.isArray(estadoBotsGuardado)
    ? estadoBotsGuardado.map((bot, indice) => ({ ...bot, nombre: bot.nombre ?? POKER_BOTS[indice]?.nombre }))
    : estadoBotsGuardado;
  if (!Array.isArray(estadoBots) || estadoBots.length !== POKER_BOTS.length) throw new ApiError(409, 'El estado de los bots no es válido');
  return { cartasJugador, cartasBots, comunitarias, baraja: mazo, estadoBots, fase: partida.fase ?? 'PREFLOP' };
}

function fuerzaPreflop(mano) {
  const rango = (carta) => valores[carta.slice(0, -1)] ?? Number(carta.slice(0, -1));
  const [a, b] = mano.map(rango).sort((x, y) => y - x);
  return { a, b, pareja: a === b, suited: mano[0].slice(-1) === mano[1].slice(-1) };
}

function botSeRetira(mano, comunitarias, fase, indice) {
  const { a, b, pareja, suited } = fuerzaPreflop(mano);
  if (fase === 'PREFLOP') return !pareja && !suited && b <= 6 + (indice % 2) && a < 12;
  const rank = (carta) => valores[carta.slice(0, -1)] ?? Number(carta.slice(0, -1));
  const ranks = [...mano, ...comunitarias].map(rank);
  const hayPareja = ranks.some((valor, i) => ranks.indexOf(valor) !== i);
  const palos = [...mano, ...comunitarias].map((carta) => carta.slice(-1));
  const hayProyectoColor = palos.some((palo) => palos.filter((actual) => actual === palo).length >= 4);
  return !hayPareja && !hayProyectoColor && Math.max(a, b) < (fase === 'FLOP' ? 10 + indice % 2 : 11 + indice % 2);
}

export function responderBotsALaSubida(estadoBots, cartasBots, comunitarias, fase, incremento) {
  return estadoBots.map((bot, indice) => {
    if (bot.retirado || botSeRetira(cartasBots[indice], comunitarias, fase, indice)) return { ...bot, retirado: true };
    return { ...bot, apuesta: toNumber(toDecimal(bot.apuesta).add(toDecimal(incremento))) };
  });
}

export function evaluarRetiradasBots(estadoBots, cartasBots, comunitarias, fase) {
  return estadoBots.map((bot, indice) => bot.retirado || botSeRetira(cartasBots[indice], comunitarias, fase, indice)
    ? { ...bot, retirado: true }
    : bot);
}

export function botes(estado, apuestaJugador) {
  return calcularRepartoBote(apuestaJugador, estado.estadoBots.map((bot) => bot.apuesta), [0]).bote;
}

export function resumen(partida, estado, saldo) {
  const activa = partida.estado === 'ACTIVA';
  const resultado = activa ? null : partida.resultado;
  const ganadores = resultado?.ganadores ?? [];
  const jugadores = [
    { id: 'jugador', nombre: 'Tú', tipo: 'HUMANO', estado: activa ? 'ACTIVO' : ganadores.includes('jugador') ? 'GANADOR' : partida.estado === 'PERDIDA' ? 'PERDEDOR' : 'RETIRADO', cartas: estado.cartasJugador, apuesta: toNumber(partida.apuestaTotal), mano: resultado?.manoJugador ?? null },
    ...POKER_BOTS.map((bot, indice) => ({
      id: bot.id, nombre: estado.estadoBots[indice].nombre ?? bot.nombre, tipo: 'BOT', estado: activa ? (estado.estadoBots[indice].retirado ? 'RETIRADO' : 'ACTIVO') : ganadores.includes(bot.id) ? 'GANADOR' : 'PERDEDOR',
      cartas: activa ? null : estado.cartasBots[indice], apuesta: toNumber(estado.estadoBots[indice].apuesta), mano: resultado?.manosBots?.[indice] ?? null,
    })),
  ];
  return {
    partidaId: partida.id, version: partida.version, estado: partida.estado, fase: partida.fase ?? estado.fase,
    cartasJugador: estado.cartasJugador, cartasBanca: activa ? [OCULTA, OCULTA] : estado.cartasBots[0],
    jugadores, turnoActual: activa ? 'JUGADOR' : null, comunitarias: estado.comunitarias,
    apuestaBase: toNumber(partida.apuesta), apuestaTotal: toNumber(partida.apuestaTotal),
    bote: botes(estado, partida.apuestaTotal),
    accionesPermitidas: activa ? (toDecimal(partida.apuestaTotal).add(toDecimal(partida.apuesta)).lte(toDecimal(saldo)) && toDecimal(partida.apuestaTotal).div(toDecimal(partida.apuesta)).lt(POKER_LIMITES.MAX_SUBIDAS) ? ['check', 'raise', 'fold'] : ['check', 'fold']) : [],
    saldoActual: toNumber(saldo), resultado,
  };
}

async function liquidar(tx, partida, estado, manos, ganadores, motivo = 'SHOWDOWN') {
  const ganaJugador = ganadores.includes(0);
  const ganador = ganaJugador ? (ganadores.length === 1 ? 'JUGADOR' : 'EMPATE') : 'BANCA';
  const reparto = calcularRepartoBote(partida.apuestaTotal, estado.estadoBots.map((bot) => bot.apuesta), ganadores);
  const pool = toDecimal(reparto.bote);
  const ganancia = toDecimal(reparto.premioJugador);
  if (ganancia.gt(0)) await acreditar(tx, partida.userId, ganancia, 'poker', 'Bote de Poker');
  const resultado = {
    ganador,
    ganadores: ganadores.map((indice) => indice === 0 ? 'jugador' : POKER_BOTS[indice - 1].id),
    motivo,
    manoJugador: manos?.[0]?.mano ?? null,
    manoBanca: manos?.[1]?.mano ?? null,
    manosBots: manos?.slice(1).map((mano) => mano.mano) ?? [null, null, null],
    bots: estado.estadoBots,
    bote: reparto.bote, ganancia: toNumber(ganancia), gananciaNeta: toNumber(ganancia.minus(toDecimal(partida.apuestaTotal))),
  };
  return { estado: ganador === 'JUGADOR' ? 'GANADA' : ganador === 'EMPATE' ? 'EMPATE' : 'PERDIDA', resultado };
}

function completarMesa(estado) {
  let actual = { ...estado, comunitarias: [...estado.comunitarias], baraja: [...estado.baraja], fase: estado.fase };
  while (actual.comunitarias.length < 5) {
    const avance = avanzarMesa(actual.fase, actual.baraja, actual.comunitarias);
    actual = { ...actual, ...avance };
  }
  return actual;
}

export const configuracion = () => ({
  apuestaMinima: POKER_LIMITES.MIN, apuestaMaxima: POKER_LIMITES.MAX, maxSubidas: POKER_LIMITES.MAX_SUBIDAS,
  nombresBots: POKER_NOMBRES_BOTS, cantidadJugadores: POKER_BOTS.length + 1,
  reglas: POKER_REGLAS,
});

export async function iniciar(userId, { apuesta }) {
  if (apuesta < POKER_LIMITES.MIN || apuesta > POKER_LIMITES.MAX) throw new ApiError(400, 'La apuesta está fuera de los límites de Poker');
  return userTransaction(userId, async (tx) => {
    if (await repo.buscarActiva(tx, userId)) throw new ApiError(409, 'Ya tienes una partida de Poker activa');
    const mazo = baraja();
    const cartasJugador = [mazo.pop(), mazo.pop()];
    const cartasBots = POKER_BOTS.map(() => [mazo.pop(), mazo.pop()]);
    const nombresBots = elegirNombresBots();
    const apuestaDecimal = dosDecimales(toDecimal(apuesta));
    const partida = await repo.crearPartida(tx, {
      userId, apuesta: apuestaDecimal, apuestaTotal: apuestaDecimal, modalidad: 'TEXAS_HOLDEM', fase: 'PREFLOP',
      cartas: cartasJugador, banca: cartasBots, comunitarias: [], baraja: mazo, ganancia: 0,
      resultado: { bots: POKER_BOTS.map((_, indice) => ({ nombre: nombresBots[indice], retirado: false, apuesta: toNumber(apuestaDecimal) })) },
    });
    await debitar(tx, userId, apuestaDecimal, 'poker', 'Apuesta inicial de Poker');
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

    let siguiente = { ...estado, estadoBots: estado.estadoBots.map((bot) => ({ ...bot })) };
    const cambios = { cartas: estado.cartasJugador, banca: estado.cartasBots, baraja: estado.baraja };
    if (accion === 'fold') {
      const ganadores = estado.estadoBots.flatMap((bot, indice) => bot.retirado ? [] : [indice + 1]);
      const liquidacion = { estado: 'PERDIDA', resultado: { ganador: 'BANCA', ganadores: ganadores.map((indice) => POKER_BOTS[indice - 1].id), motivo: 'RETIRO', manoJugador: null, manoBanca: null, manosBots: [null, null, null], bots: siguiente.estadoBots, bote: botes(estado, partida.apuestaTotal), ganancia: 0, gananciaNeta: toNumber(toDecimal(partida.apuestaTotal).negated()) } };
      const actualizado = await repo.guardarPartida(tx, partida.id, { ...cambios, estado: liquidacion.estado, fase: 'SHOWDOWN', resultado: liquidacion.resultado, ganancia: 0 });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      return resumen(actualizado, { ...siguiente, fase: 'SHOWDOWN' }, wallet.saldo);
    }

    let apuestaJugador = toDecimal(partida.apuestaTotal);
    if (accion === 'raise') {
      apuestaJugador = apuestaJugador.add(toDecimal(partida.apuesta));
      // Primero responden al raise con la información disponible en esta calle.
      siguiente.estadoBots = responderBotsALaSubida(siguiente.estadoBots, estado.cartasBots, estado.comunitarias, estado.fase, partida.apuesta);
      cambios.apuestaTotal = { increment: partida.apuesta };
    }
    const avance = avanzarMesa(estado.fase, estado.baraja, estado.comunitarias);
    siguiente = { ...siguiente, ...avance };
    // Los bots supervivientes evalúan la nueva carta; quien ya igualó conserva su aporte si se retira aquí.
    siguiente.estadoBots = evaluarRetiradasBots(siguiente.estadoBots, estado.cartasBots, avance.comunitarias, avance.fase);
    const vivos = siguiente.estadoBots.flatMap((bot, indice) => bot.retirado ? [] : [indice + 1]);
    let liquidacion;
    if (vivos.length === 0) {
      const ganadores = [0];
      siguiente = completarMesa(siguiente);
      const manos = resolverShowdown([estado.cartasJugador, ...estado.cartasBots], siguiente.comunitarias).manos;
      liquidacion = await liquidar(tx, { ...partida, apuestaTotal: apuestaJugador }, siguiente, manos, ganadores, 'BOT_FOLD');
    } else if (avance.fase === 'RIVER') {
      const showdown = resolverShowdown([estado.cartasJugador, ...estado.cartasBots], avance.comunitarias);
      const mejorManoActiva = [0, ...vivos].map((indice) => showdown.manos[indice]);
      const maxima = mejorManoActiva.reduce((mejor, mano) => compararManos(mano, mejor) > 0 ? mano : mejor);
      const ganadores = [0, ...vivos].filter((indice) => compararManos(showdown.manos[indice], maxima) === 0);
      liquidacion = await liquidar(tx, { ...partida, apuestaTotal: apuestaJugador }, siguiente, showdown.manos, ganadores);
    }

    if (accion === 'raise') partida.apuestaTotal = apuestaJugador;
    cambios.banca = estado.cartasBots;
    cambios.comunitarias = siguiente.comunitarias;
    cambios.baraja = siguiente.baraja;
    cambios.fase = liquidacion ? 'SHOWDOWN' : siguiente.fase;
    cambios.estado = liquidacion?.estado ?? 'ACTIVA';
    cambios.resultado = liquidacion?.resultado ?? { bots: siguiente.estadoBots };
    if (liquidacion) cambios.ganancia = liquidacion.resultado.ganancia;
    const actualizado = await repo.guardarPartida(tx, partida.id, cambios);
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return resumen(actualizado, { ...siguiente, fase: cambios.fase }, wallet.saldo);
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
      bote: resultado.bote ?? toNumber(toDecimal(partida.apuestaTotal).times(POKER_BOTS.length + 1)), estado: partida.estado, fase: partida.fase,
      manoJugador: resultado.manoJugador ?? null, manoBanca: resultado.manoBanca ?? null,
      ganancia: toNumber(partida.ganancia), creadaEn: partida.createdAt, cerradaEn: partida.finishedAt,
    };
  });
}
