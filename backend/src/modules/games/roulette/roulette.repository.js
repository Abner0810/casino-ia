import { prisma } from '../../../shared/prisma.client.js';

export const crearRonda = (tx, data) => tx.rondaRuleta.create({ data });
export const rondasDeUsuario = (userId, limite = 10) => prisma.rondaRuleta.findMany({
  where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limite,
});
