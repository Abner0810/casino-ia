import * as service from './blackjack.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const iniciar = manejar(async (req, res) => {
  res.status(201).json(await service.iniciar(req.user.id, req.body));
});

export const pedirCarta = manejar(async (req, res) => {
  res.json(await service.pedirCarta(req.user.id, req.params.id));
});

export const plantarse = manejar(async (req, res) => {
  res.json(await service.plantarse(req.user.id, req.params.id));
});

export const dividir = manejar(async (req, res) => {
  res.json(await service.dividir(req.user.id, req.params.id));
});

export const doblar = manejar(async (req, res) => {
  res.json(await service.doblar(req.user.id, req.params.id));
});

export const salir = manejar(async (req, res) => {
  res.json(await service.salir(req.user.id, req.params.id));
});

export const ultimasPartidas = manejar(async (req, res) => {
  res.json({ items: await service.ultimasPartidas(req.user.id) });
});

export const activa = manejar(async (req, res) => res.json(await service.activa(req.user.id)));
export const consultar = manejar(async (req, res) => res.json(await service.consultar(req.user.id, req.params.id)));
