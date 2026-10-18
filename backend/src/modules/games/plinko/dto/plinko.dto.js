import { z } from 'zod';
import { RIESGOS_VALIDOS } from '../plinko.config.js';

export const betDTO = z.object({
  apuesta: z
    .number({ invalid_type_error: 'La apuesta debe ser numérica' })
    .positive('La apuesta debe ser positiva')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'La apuesta admite máximo 2 decimales'),
  riesgo: z.enum(RIESGOS_VALIDOS, {
    errorMap: () => ({ message: `Riesgo no válido. Usa: ${RIESGOS_VALIDOS.join(', ')}` }),
  }),
});
