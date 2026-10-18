import { prisma } from '../../shared/prisma.client.js';

// Historial paginado con filtros (los filtros se construyen en el service,
// el repository solo ejecuta)
export const historial = (userId, where, pagina, porPagina) =>
  prisma.$transaction([
    prisma.movimiento.findMany({
      where: { userId, ...where },
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        tipo: true,
        monto: true,
        saldoAntes: true,
        saldoDespues: true,
        juego: true,
        descripcion: true,
        createdAt: true,
      },
    }),
    prisma.movimiento.count({ where: { userId, ...where } }),
  ]);
