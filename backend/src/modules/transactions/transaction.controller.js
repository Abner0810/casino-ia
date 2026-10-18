import * as service from './transaction.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const depositar = manejar(async (req, res) => {
  res.status(201).json(await service.depositar(req.user.id, req.body));
});

export const retirar = manejar(async (req, res) => {
  res.json(await service.retirar(req.user.id, req.body));
});

export const historial = manejar(async (req, res) => {
  res.json(await service.historial(req.user.id, req.query));
});
