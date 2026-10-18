import { prisma } from '../../shared/prisma.client.js';

export const getWallet = (userId) =>
  prisma.wallet.findUnique({
    where: { userId },
    select: { saldo: true, bono: true, updatedAt: true },
  });

// Balance consolidado: totales del ledger por tipo de movimiento
export const getBalanceConsolidado = async (userId) => {
  const [wallet, apostado, ganado, depositos, retiros] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId }, select: { saldo: true, bono: true } }),
    prisma.movimiento.aggregate({
      where: { userId, tipo: 'APUESTA' },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.movimiento.aggregate({
      where: { userId, tipo: 'PREMIO' },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.movimiento.aggregate({
      where: { userId, tipo: 'DEPOSITO' },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.movimiento.aggregate({
      where: { userId, tipo: 'RETIRO' },
      _sum: { monto: true },
      _count: true,
    }),
  ]);
  return { wallet, apostado, ganado, depositos, retiros };
};
