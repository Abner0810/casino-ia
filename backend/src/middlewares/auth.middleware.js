// MIDDLEWARE DE AUTENTICACIÓN
// Extrae el Bearer token (access JWT, vigencia 30 min), lo verifica y
// deja el usuario resuelto en req.user. El internalId del token NUNCA
// se compara con IDs que vengan del cliente: para recursos propios el
// server deriva el usuario desde aquí, cerrando el IDOR por diseño.

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../shared/ApiError.js';

export function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw new ApiError(401, 'Token de acceso requerido');
    }
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch {
      throw new ApiError(401, 'Token inválido o expirado');
    }
    req.user = { id: payload.sub, rol: payload.rol };
    next();
  } catch (error) {
    next(error);
  }
}
