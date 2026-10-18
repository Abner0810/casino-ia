// RATE LIMITING
// General: 100 req/min por IP.
// Estricto en /auth (10/min): fuerza bruta de credenciales.
// Estricto en apuestas (30/min): abuso de juego/botting.

import { rateLimit } from 'express-rate-limit';

const mensaje = (limite) => ({
  error: `Demasiadas peticiones. Límite de ${limite} por minuto, intenta más tarde.`,
});

export const limiterGeneral = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensaje(100),
});

export const limiterAuth = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensaje(10),
});

export const limiterJuegos = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensaje(30),
});
