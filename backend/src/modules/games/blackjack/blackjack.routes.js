import { Router } from 'express';
import * as controller from './blackjack.controller.js';
import * as service from './blackjack.service.js';
import { operationHandler } from '../../../middlewares/operation.handler.js';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody, validateParams } from '../../../middlewares/validation.middleware.js';
import { startDTO, partidaParamsDTO, actionDTO } from './dto/blackjack.dto.js';

const router = Router();

// Todas las rutas bajo auth + rate-limit de juegos (30/min)
router.post('/start', auth, limiterJuegos, validateBody(startDTO), operationHandler('blackjack.start', 201, (req) => service.iniciar(req.user.id, req.body)));
router.get('/rounds', auth, controller.ultimasPartidas);
router.get('/active', auth, controller.activa);
router.get('/:id', auth, validateParams(partidaParamsDTO), controller.consultar);
for (const [action, fn] of Object.entries({ hit: service.pedirCarta, stand: service.plantarse, split: service.dividir, double: service.doblar, exit: service.salir })) {
  router.post(`/:id/${action}`, auth, limiterJuegos, validateParams(partidaParamsDTO), validateBody(actionDTO), operationHandler(`blackjack.${action}`, 200, (req) => fn(req.user.id, req.params.id), { versioned: true }));
}

export default router;
