// MIDDLEWARE DE VALIDACIÓN DE FORMATO (ejecuta los DTOs / schemas Zod)
// Un único middleware genérico por ubicación: body, params o query.
// Si el schema falla → 400 con el detalle campo a campo.
// Si pasa → reemplaza el dato con la versión "limpia" (whitelist:
// los campos desconocidos quedan eliminados del payload).

import { ApiError } from '../shared/ApiError.js';

const ejecutar = (schema, data, aplicar, req) => {
  const resultado = schema.safeParse(data);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((i) => ({
      campo: i.path.join('.') || '(raíz)',
      mensaje: i.message,
    }));
    throw new ApiError(400, 'Datos de entrada inválidos', detalles);
  }
  aplicar(req, resultado.data);
};

export const validateBody = (schema) => (req, res, next) => {
  try {
    ejecutar(schema, req.body ?? {}, (r, v) => {
      r.body = v;
    }, req);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    ejecutar(schema, req.params, (r, v) => {
      r.params = v;
    }, req);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    ejecutar(schema, req.query, (r, v) => {
      Object.defineProperty(r, 'query', { value: v, writable: true, configurable: true, enumerable: true });
    }, req);
    next();
  } catch (error) {
    next(error);
  }
};
