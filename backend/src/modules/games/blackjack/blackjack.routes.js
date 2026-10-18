import { Router } from 'express';
import * as controller from './blackjack.controller.js';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody, validateParams } from '../../../middlewares/validation.middleware.js';
import { startDTO, partidaParamsDTO } from './dto/blackjack.dto.js';

const router = Router();

// Todas las rutas bajo auth + rate-limit de juegos (30/min)
router.post('/start', auth, limiterJuegos, validateBody(startDTO), controller.iniciar);
router.get('/rounds', auth, controller.ultimasPartidas);
router.post('/:id/hit', auth, limiterJuegos, validateParams(partidaParamsDTO), controller.pedirCarta);
router.post('/:id/stand', auth, limiterJuegos, validateParams(partidaParamsDTO), controller.plantarse);
router.post('/:id/split', auth, limiterJuegos, validateParams(partidaParamsDTO), controller.dividir);
router.post('/:id/double', auth, limiterJuegos, validateParams(partidaParamsDTO), controller.doblar);
router.post('/:id/exit', auth, limiterJuegos, validateParams(partidaParamsDTO), controller.salir);

export default router;
