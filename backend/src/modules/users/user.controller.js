import * as service from './user.service.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const verPerfil = manejar(async (req, res) => {
  res.json(await service.verPerfil(req.user.id));
});

export const editarPerfil = manejar(async (req, res) => {
  res.json(await service.editarPerfil(req.user.id, req.body));
});

// "Método para ir a los juegos" del enunciado: POST /api/users/games/:juego/access
export const accesoJuego = manejar(async (req, res) => {
  res.json(await service.accesoJuego(req.user.id, req.params.juego));
});
