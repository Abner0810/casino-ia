import { prisma } from '../../shared/prisma.client.js';

// Todas las mutaciones reciben el `tx` de la transacción activa.
export const crearPago = (tx, data) => tx.pago.create({ data });

export const actualizarSesion = (tx, id, stripeSessionId) =>
  tx.pago.update({ where: { id }, data: { stripeSessionId } });

export const buscarPorId = (tx, id, userId) =>
  tx.pago.findFirst({ where: { id, ...(userId ? { userId } : {}) } });

export const buscarPorSesion = (tx, stripeSessionId) =>
  tx.pago.findUnique({ where: { stripeSessionId } });

/**
 * CREANDO/PENDIENTE -> PAGADO condicional: si otro proceso (webhook o /sync)
 * ya lo cambió, count === 0 y no se vuelve a acreditar.
 */
export const marcarPagado = (tx, id, stripePaymentIntentId) =>
  tx.pago.updateMany({
    where: { id, estado: { in: ['CREANDO', 'PENDIENTE'] } },
    data: { estado: 'PAGADO', pagadoEn: new Date(), stripePaymentIntentId },
  });

export const marcarFallido = (tx, id, estado) =>
  tx.pago.updateMany({ where: { id, estado: 'PENDIENTE' }, data: { estado } });

export { prisma };
