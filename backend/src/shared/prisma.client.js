import { PrismaClient } from '@prisma/client';

// Instancia singleton de Prisma. Único acceso a la DB, siempre vía repositories.
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
