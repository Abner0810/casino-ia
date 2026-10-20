// SERVICIO DE RECARGAS Y RETIROS
//
// La regla de oro: saldo y ledger se mutan en la MISMA $transaction.
// El retiro usa updateMany condicional (WHERE saldo >= monto) como
// candado lógico: si dos retiros simultáneos compiten, solo uno pasa
// y el otro recibe 400 sin tocar nada (atomicidad sin SELECT FOR UPDATE).

import { userTransaction } from '../../shared/transaction.js';
import { ApiError } from '../../shared/ApiError.js';
import { toDecimal, toNumber } from '../../shared/utils/money.js';
import { acreditar, debitar } from '../../shared/utils/ledger.js';
import * as repo from './transaction.repository.js';

export async function depositar(userId, { monto, metodo }) {
  const montoDec = toDecimal(monto);

  const saldoFinal = await userTransaction(userId, async (tx) => {
    return acreditar(
      tx,
      userId,
      montoDec,
      null,
      `Recarga simulada vía ${metodo}`,
      'DEPOSITO'
    );
  });

  return {
    mensaje: `Recarga de ${toNumber(montoDec)} registrada correctamente`,
    saldoActual: toNumber(saldoFinal),
  };
}

export async function retirar(userId, { monto, metodo }) {
  const montoDec = toDecimal(monto);

  const saldoFinal = await userTransaction(userId, async (tx) => {
    return debitar(
      tx,
      userId,
      montoDec,
      null,
      `Retiro vía ${metodo}`,
      'RETIRO'
    );
  });

  return {
    mensaje: `Retiro de ${toNumber(montoDec)} procesado correctamente`,
    saldoActual: toNumber(saldoFinal),
  };
}

export async function historial(userId, { pagina, porPagina, tipo, desde, hasta }) {
  const where = {};
  if (tipo) where.tipo = tipo;
  if (desde || hasta) {
    where.createdAt = {};
    // Defensa en profundidad: acotar 'desde' al presente (con tolerancia de
    // reloj) evita rangos cuyo inicio es futuro aunque el DTO lo permitiese.
    if (desde) where.createdAt.gte = new Date(Math.min(desde.getTime(), Date.now()));
    if (hasta) where.createdAt.lte = hasta;
  }

  const [movimientos, total] = await repo.historial(userId, where, pagina, porPagina);

  return {
    items: movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: toNumber(m.monto),
      saldoAntes: toNumber(m.saldoAntes),
      saldoDespues: toNumber(m.saldoDespues),
      juego: m.juego,
      descripcion: m.descripcion,
      fecha: m.createdAt,
    })),
    paginacion: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}
