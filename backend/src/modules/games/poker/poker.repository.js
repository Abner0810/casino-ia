import { prisma } from '../../../shared/prisma.client.js';

export const crearPartida = (tx, data) => tx.partidaPoker.create({ data });
export const buscarPropia = (tx, userId, id) => tx.partidaPoker.findFirst({ where: { id, userId } });
export const buscarActiva = (tx, userId) => tx.partidaPoker.findFirst({ where: { userId, estado: 'ACTIVA', modalidad: 'TEXAS_HOLDEM' } });
export const bloquearPartida = (tx, userId, id) =>
  tx.$queryRaw`SELECT "id" FROM "PartidaPoker" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE`;
export const guardarPartida = (tx, id, data) =>
  tx.partidaPoker.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
export const partidasDeUsuario = (userId, limite = 10) =>
  prisma.partidaPoker.findMany({
    where: { userId, modalidad: 'TEXAS_HOLDEM' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limite,
  });
