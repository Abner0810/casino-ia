// MIDDLEWARE DE AUTORIZACIÓN
// Se aplica DESPUÉS de auth. Decide qué puede hacer el usuario:
//  - soloRoles('ADMIN'): restringe por rol.
//  - exigirPropietario(fn): compara el dueño del recurso contra req.user.id.

import { ApiError } from '../shared/ApiError.js';

export const soloRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return next(new ApiError(403, 'No tienes permiso para esta acción'));
  }
  next();
};

/**
 * reqPropietario extrae el userId dueño del recurso (normalmente desde
 * una query del repository). Si no existe el recurso, next() para que
 * el service responda 404 sin revelar si el ID es de otro usuario.
 */
export const exigirPropietario = (reqPropietario) => (req, res, next) => {
  try {
    const dueno = reqPropietario(req);
    if (dueno && dueno !== req.user.id) {
      // recurso de otro usuario: 404, no 403 — no confirmamos su existencia
      return next(new ApiError(404, 'Recurso no encontrado'));
    }
    next();
  } catch (error) {
    next(error);
  }
};
