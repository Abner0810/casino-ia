import { prisma } from '../../../shared/prisma.client.js';

// Siempre se pasa el tx de la $transaction para que la ronda y el dinero
// se confirmen juntos o reviertan juntos.
export const crearRonda = (tx, data) => tx.rondaPlinko.create({ data });

export const rondasDeUsuario = (userId, limite = 10) =>
  prisma.rondaPlinko.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
