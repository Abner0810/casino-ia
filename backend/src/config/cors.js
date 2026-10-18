import { env } from './env.js';

// En producción NUNCA '*': solo el dominio de Firebase Hosting (+ dominios extra declarados)
export const corsConfig = {
  origin: env.corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
