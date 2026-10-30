import { toDecimal } from './money.js';
import { currentTransaction } from '../transaction.js';
import { ApiError } from '../ApiError.js';

function validateAmount(monto) {
  if (!monto.isFinite() || !monto.gt(0) || monto.decimalPlaces() > 2) {
    throw new ApiError(400, 'Monto inválido', undefined, 'INVALID_AMOUNT');
  }
}

// ─────────────────────────────────────────────────────────────
// LEDGER helper: la ÚNICA forma autorizada de tocar un saldo.
// Siempre dentro de una $transaction de Prisma. Si algo falla
// después del débito/crédito, la transacción revierte todo
// (saldo y movimiento) — atomicidad garantizada.
// ─────────────────────────────────────────────────────────────

/**
 * Descuenta saldo de forma atómica y registra el movimiento APUESTA/RETIRO.
 * Lanza ApiError(400) si el saldo no alcanza (la $transaction revierte).
 */
export async function debitar(tx, userId, monto, juego, descripcion, tipo = 'APUESTA') {
  const montoDec = toDecimal(monto);
  validateAmount(montoDec);
  const actualizado = await tx.wallet.updateMany({
    where: { userId, saldo: { gte: montoDec } }, // condición = candado lógico contra carreras
    data: { saldo: { decrement: montoDec } },
  });
  if (actualizado.count === 0) {
    throw new ApiError(400, 'Saldo insuficiente para esta operación', undefined, 'INSUFFICIENT_BALANCE');
  }
  const despues = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  await tx.movimiento.create({
    data: {
      userId,
      operationId: currentTransaction()?.operationId,
      tipo,
      monto: montoDec,
      saldoAntes: despues.saldo.add(montoDec),
      saldoDespues: despues.saldo,
      juego: juego ?? null,
      descripcion,
    },
  });
  return despues.saldo;
}

/**
 * Acredita saldo (premio, devolución, depósito) y registra el movimiento.
 */
export async function acreditar(tx, userId, monto, juego, descripcion, tipo = 'PREMIO', extra = {}) {
  const montoDec = toDecimal(monto);
  validateAmount(montoDec);
  const limit = toDecimal('9999999999.99').minus(montoDec);
  const updated = await tx.wallet.updateMany({
    where: { userId, saldo: { lte: limit } },
    data: { saldo: { increment: montoDec } },
  });
  if (updated.count !== 1) throw new ApiError(400, 'El saldo supera el máximo permitido', undefined, 'BALANCE_LIMIT');
  const despues = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  await tx.movimiento.create({
    data: {
      userId,
      operationId: currentTransaction()?.operationId,
      tipo,
      monto: montoDec,
      saldoAntes: despues.saldo.minus(montoDec),
      saldoDespues: despues.saldo,
      juego: juego ?? null,
      descripcion,
      ...(extra.pagoId ? { pagoId: extra.pagoId } : {}),
    },
  });
  return despues.saldo;
}
