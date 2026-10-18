import { z } from 'zod';

const METODOS = ['tarjeta', 'transferencia', 'crypto', 'simulado'];

export const depositDTO = z.object({
  monto: z
    .number({ invalid_type_error: 'El monto debe ser numérico' })
    .positive('El monto debe ser positivo')
    .max(1_000_000, 'El monto máximo por recarga es 1,000,000')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'El monto admite máximo 2 decimales'),
  metodo: z.enum(METODOS).default('simulado'),
});

export const withdrawDTO = z.object({
  monto: z
    .number({ invalid_type_error: 'El monto debe ser numérico' })
    .positive('El monto debe ser positivo')
    .max(1_000_000, 'El monto máximo por retiro es 1,000,000')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'El monto admite máximo 2 decimales'),
  metodo: z.enum(METODOS).default('transferencia'),
});

export const historyQueryDTO = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
  tipo: z.enum(['DEPOSITO', 'RETIRO', 'APUESTA', 'PREMIO']).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});
