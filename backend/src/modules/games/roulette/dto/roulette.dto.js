import { z } from 'zod';
import { RULETA_LIMITES } from '../roulette.config.js';

const apuesta = z.number().min(RULETA_LIMITES.MIN).max(RULETA_LIMITES.MAX)
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), 'La apuesta admite máximo 2 decimales');
export const betDTO = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('pleno'), apuesta, seleccion: z.number().int().min(0).max(36) }),
  z.object({ tipo: z.literal('color'), apuesta, seleccion: z.enum(['rojo', 'negro']) }),
  z.object({ tipo: z.literal('paridad'), apuesta, seleccion: z.enum(['par', 'impar']) }),
  z.object({ tipo: z.literal('docena'), apuesta, seleccion: z.number().int().min(1).max(3) }),
  z.object({ tipo: z.literal('columna'), apuesta, seleccion: z.number().int().min(1).max(3) }),
]);
