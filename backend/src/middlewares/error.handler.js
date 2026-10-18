// MANEJADOR GLOBAL DE ERRORES
// Todos los errores terminan acá (controllers usan next(error)).
// Respuesta siempre uniforme: { error, detalles? }

import { Prisma } from '@prisma/client';
import { ApiError } from '../shared/ApiError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Errores de negocio/controlados
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { detalles: err.details } : {}),
    });
  }

  // Errores conocidos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
  }

  // JSON malformado u otros errores de body parser
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Cuerpo JSON inválido o demasiado grande' });
  }

  // Error inesperado: se loguea completo, se responde genérico
  console.error('[ERROR NO CONTROLADO]', err);
  return res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.esProduccion ? {} : { detalle: err.message }),
  });
}
