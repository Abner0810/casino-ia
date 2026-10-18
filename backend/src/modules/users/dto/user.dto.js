import { z } from 'zod';

export const updateProfileDTO = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
});

export const accesoJuegoDTO = z.object({
  juego: z.enum(['plinko', 'blackjack'], {
    errorMap: () => ({ message: 'Juego no válido. Usa "plinko" o "blackjack"' }),
  }),
});
