import { Router } from 'express';
import * as controller from './plinko.controller.js';
import * as service from './plinko.service.js';
import { operationHandler } from '../../../middlewares/operation.handler.js';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody } from '../../../middlewares/validation.middleware.js';
import { betDTO } from './dto/plinko.dto.js';

const router = Router();

// Rate-limit estricto (30/min) contra botting de apuestas
router.post('/bet', auth, limiterJuegos, validateBody(betDTO), operationHandler('plinko.bet', 201, (req) => service.apostar(req.user.id, req.body)));
router.get('/config', auth, (req, res) => res.json(service.configuracion()));
router.get('/rounds', auth, controller.ultimasRondas);

export default router;
