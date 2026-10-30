// RATE LIMITING
// General: 100 req/min por IP.
// Estricto en /auth (10/min): fuerza bruta de credenciales.
// Estricto en apuestas (30/min): abuso de juego/botting.

import { rateLimit } from 'express-rate-limit';

const mensaje = (limite) => (req, res) => res.status(429).json({
  error: `Demasiadas peticiones. Límite de ${limite} por minuto, intenta más tarde.`,
  codigo: 'RATE_LIMITED', requestId: req.requestId,
});

export const limiterGeneral = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: mensaje(100),
});

export const limiterAuth = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: mensaje(10),
});

export const limiterJuegos = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: mensaje(30),
});

// Crear sesiones de pago es costoso (llamada a Stripe): 10/min por IP.
export const limiterPagos = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: mensaje(10),
});
