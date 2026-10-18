import { prisma } from '../../shared/prisma.client.js';

export const findByEmail = (email) => prisma.user.findUnique({ where: { email } });

export const findById = (id) => prisma.user.findUnique({ where: { id } });

// Crea usuario + billetera en la misma transacción (nunca un usuario sin wallet)
export const createWithWallet = (data) =>
  prisma.user.create({
    data: {
      ...data,
      wallet: { create: { saldo: 0, bono: 0 } },
    },
  });

export const createRefreshToken = (data) => prisma.refreshToken.create({ data });

// Busca refresh tokens válidos: sin revocar y sin expirar
export const findRefreshValido = (tokenHash) =>
  prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

export const revokeRefresh = (id) =>
  prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });

export const revokeAllRefreshDe = (userId) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
