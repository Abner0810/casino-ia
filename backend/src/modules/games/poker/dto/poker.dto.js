import { z } from 'zod';
import { POKER_LIMITES } from '../poker.config.js';

export const startDTO = z.object({ apuesta: z.number().min(POKER_LIMITES.MIN).max(POKER_LIMITES.MAX)
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), 'La apuesta admite máximo 2 decimales') });
export const actionDTO = z.object({
  version: z.number().int().nonnegative(),
  accion: z.enum(['check', 'raise', 'fold']),
});
export const partidaParamsDTO = z.object({ id: z.string().uuid() });
