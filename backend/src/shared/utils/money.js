import { Prisma } from '@prisma/client';

// Todo el dinero se maneja con Decimal de Prisma (nunca Float)
export const toDecimal = (n) => new Prisma.Decimal(n);
export const toNumber = (d) => Number(d.toString());
export const dosDecimales = (d) => new Prisma.Decimal(d).toDecimalPlaces(2);
