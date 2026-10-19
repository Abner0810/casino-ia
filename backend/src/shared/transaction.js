import { AsyncLocalStorage } from 'node:async_hooks';
import { prisma } from './prisma.client.js';

const context = new AsyncLocalStorage();
export const currentTransaction = () => context.getStore();

// Orden de locks: wallet del usuario, luego partida/operación.
export async function userTransaction(userId, fn) {
  const active = currentTransaction();
  if (active) {
    if (active.userId !== userId) throw new Error('Transaction owner mismatch');
    return fn(active.tx);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
    return context.run({ tx, userId }, () => fn(tx));
  }, { maxWait: 10000, timeout: 15000 });
}
