import * as service from './wallet.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const verSaldo = manejar(async (req, res) => {
  res.json(await service.verSaldo(req.user.id));
});

export const verBalance = manejar(async (req, res) => {
  res.json(await service.verBalance(req.user.id));
});
