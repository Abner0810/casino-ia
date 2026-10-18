// Controller delgado: orquesta, no valida ni decide.
// La validación de formato ya la hizo el middleware con el DTO.

import * as service from './auth.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const register = manejar(async (req, res) => {
  const resultado = await service.register(req.body);
  res.status(201).json(resultado);
});

export const login = manejar(async (req, res) => {
  res.json(await service.login(req.body));
});

export const refresh = manejar(async (req, res) => {
  res.json(await service.refresh(req.body.refreshToken));
});

export const logout = manejar(async (req, res) => {
  res.json(await service.logout(req.body.refreshToken));
});
