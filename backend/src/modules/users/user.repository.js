import { prisma } from '../../shared/prisma.client.js';

export const findById = (id) =>
  prisma.user.findUnique({
    where: { id },
    include: { wallet: { select: { saldo: true, bono: true } } },
  });

export const updateNombre = (id, nombre) =>
  prisma.user.update({
    where: { id },
    data: { nombre },
    include: { wallet: { select: { saldo: true, bono: true } } },
  });
