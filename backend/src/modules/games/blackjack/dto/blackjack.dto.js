import { z } from 'zod';

export const startDTO = z.object({
  apuesta: z
    .number({ invalid_type_error: 'La apuesta debe ser numérica' })
    .positive('La apuesta debe ser positiva')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'La apuesta admite máximo 2 decimales'),
});

// Todas las acciones sobre una partida usan su UUID como param.
// El ownership se resuelve en el service con {id, userId} → recurso
// ajeno responde 404 sin confirmar su existencia.
export const partidaParamsDTO = z.object({
  id: z.string().uuid('ID de partida inválido'),
});
