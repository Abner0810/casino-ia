import * as service from './plinko.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const apostar = manejar(async (req, res) => {
  res.status(201).json(await service.apostar(req.user.id, req.body));
});

export const ultimasRondas = manejar(async (req, res) => {
  res.json({ items: await service.ultimasRondas(req.user.id) });
});
