import { z } from 'zod';

const dosDecimales = (v) => /^\d+(\.\d{1,2})?$/.test(String(v));

// La moneda NO la elige el cliente: la fija el servidor (env.STRIPE_CURRENCY).
// .strict() rechaza campos extra con 400 en vez de descartarlos en silencio.
export const checkoutDTO = z.object({
  monto: z
    .number({ invalid_type_error: 'El monto debe ser numérico' })
    .min(5, 'El monto mínimo por recarga es 5,00 Bs')
    .max(500, 'El monto máximo por recarga es 500,00 Bs')
    .refine(dosDecimales, 'El monto admite máximo 2 decimales'),
}).strict();

export const pagoIdParamDTO = z.object({
  id: z.string().uuid('Identificador de pago inválido'),
});
