import { z } from 'zod';

export const registerDTO = z.object({
  email: z.string().trim().email('Email inválido').max(150),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite máximo 72 bytes UTF-8'),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
});

export const loginDTO = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite máximo 72 bytes UTF-8'),
});

export const refreshDTO = z.object({
  refreshToken: z.string().min(20, 'Refresh token inválido'),
});

export const logoutDTO = refreshDTO;

// Cambio de contraseña autenticado: exige la actual y una nueva distinta.
// Mismas reglas que el registro (8–72 caracteres y 72 bytes UTF-8).
export const changePasswordDTO = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es obligatoria')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite máximo 72 bytes UTF-8'),
  passwordNueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite máximo 72 bytes UTF-8'),
}).refine((v) => v.passwordActual !== v.passwordNueva, {
  message: 'La nueva contraseña debe ser distinta a la actual',
  path: ['passwordNueva'],
});
