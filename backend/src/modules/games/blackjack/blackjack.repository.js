import { prisma } from '../../../shared/prisma.client.js';

export const crearPartida = (tx, data) => tx.partidaBlackjack.create({ data });

// ownership integrado en la query: solo encuentra partidas del usuario
export const partidaActiva = (tx, id, userId) =>
  (tx ?? prisma).partidaBlackjack.findFirst({
    where: { id, userId, estado: 'ACTIVA' },
  });

export const guardarPartida = (tx, id, data) =>
  tx.partidaBlackjack.update({ where: { id }, data });

export const partidasDeUsuario = (userId, limite = 10) =>
  prisma.partidaBlackjack.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
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
