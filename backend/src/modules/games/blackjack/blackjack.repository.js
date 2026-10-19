import { prisma } from '../../../shared/prisma.client.js';

export const crearPartida = (tx, data) => tx.partidaBlackjack.create({ data });

// ownership integrado en la query: solo encuentra partidas del usuario
export const partidaActiva = async (tx, id, userId) => {
  // Serializa acciones de la misma partida antes de leer su estado mutable.
  await tx.$queryRaw`SELECT "id" FROM "PartidaBlackjack" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE`;
  return tx.partidaBlackjack.findFirst({
    where: { id, userId, estado: 'ACTIVA' },
  });
};

export const guardarPartida = (tx, id, data) =>
  tx.partidaBlackjack.update({ where: { id }, data: { ...data, version: { increment: 1 } } });

export const buscarPropia = (tx, userId, id) => tx.partidaBlackjack.findFirst({ where: { id, userId } });
export const buscarActiva = (tx, userId) => tx.partidaBlackjack.findFirst({ where: { userId, estado: 'ACTIVA' } });

export const partidasDeUsuario = (userId, limite = 10) =>
  prisma.partidaBlackjack.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limite,
    select: {
      id: true,
      apuesta: true,
      estado: true,
      manos: true,
      resultado: true,
      createdAt: true,
      finishedAt: true,
    },
  });
