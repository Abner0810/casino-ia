import { randomInt } from 'node:crypto';
import { userTransaction } from '../../../shared/transaction.js';
import { debitar, acreditar } from '../../../shared/utils/ledger.js';
import { toDecimal, toNumber, dosDecimales } from '../../../shared/utils/money.js';
import { RULETA_LIMITES, RULETA_PAGOS } from './roulette.config.js';
import { colorDe, pagoDe } from './roulette.logic.js';
import * as repo from './roulette.repository.js';

export const configuracion = () => ({ apuestaMinima: RULETA_LIMITES.MIN, apuestaMaxima: RULETA_LIMITES.MAX, pagos: RULETA_PAGOS });

export async function apostar(userId, { apuesta, tipo, seleccion }) {
  const numero = randomInt(37);
  const multiplicador = pagoDe(numero, tipo, seleccion);
  const montoApuesta = dosDecimales(toDecimal(apuesta));
  const ganancia = montoApuesta.times(multiplicador);
  const resultado = await userTransaction(userId, async (tx) => {
    let saldoActual = await debitar(tx, userId, montoApuesta, 'roulette', `Ruleta ${tipo}: ${seleccion}`);
    if (ganancia.gt(0)) saldoActual = await acreditar(tx, userId, ganancia, 'roulette', `Premio ruleta: ${numero}`);
    const ronda = await repo.crearRonda(tx, { userId, apuesta: montoApuesta, tipo, seleccion: String(seleccion), numero, multiplicador, ganancia });
    return { rondaId: ronda.id, saldoActual };
  });
  return { rondaId: resultado.rondaId, numero, color: colorDe(numero), apuesta: toNumber(montoApuesta), tipo, seleccion, multiplicador, ganancia: toNumber(ganancia), gananciaNeta: toNumber(ganancia.minus(montoApuesta)), saldoActual: toNumber(resultado.saldoActual) };
}

export async function ultimasRondas(userId) {
  const rondas = await repo.rondasDeUsuario(userId);
  return rondas.map((r) => ({ id: r.id, numero: r.numero, color: colorDe(r.numero), apuesta: toNumber(r.apuesta), tipo: r.tipo, seleccion: ['pleno', 'docena', 'columna'].includes(r.tipo) ? Number(r.seleccion) : r.seleccion, multiplicador: r.multiplicador, ganancia: toNumber(r.ganancia), fecha: r.createdAt }));
}
