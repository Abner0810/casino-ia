import { toDecimal } from './money.js';

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
  const actualizado = await tx.wallet.updateMany({
    where: { userId, saldo: { gte: montoDec } }, // condición = candado lógico contra carreras
    data: { saldo: { decrement: montoDec } },
  });
  if (actualizado.count === 0) {
    const { ApiError } = await import('../ApiError.js');
    throw new ApiError(400, 'Saldo insuficiente para esta operación');
  }
  const despues = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  await tx.movimiento.create({
    data: {
      userId,
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
export async function acreditar(tx, userId, monto, juego, descripcion, tipo = 'PREMIO') {
  const montoDec = toDecimal(monto);
  const antes = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const despues = await tx.wallet.update({
    where: { userId },
    data: { saldo: { increment: montoDec } },
  });
  await tx.movimiento.create({
    data: {
      userId,
      tipo,
      monto: montoDec,
      saldoAntes: antes.saldo,
      saldoDespues: despues.saldo,
      juego: juego ?? null,
      descripcion,
    },
  });
  return despues.saldo;
}
