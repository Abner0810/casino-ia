import { Router } from 'express';
import * as controller from './plinko.controller.js';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody } from '../../../middlewares/validation.middleware.js';
import { betDTO } from './dto/plinko.dto.js';

const router = Router();

// Rate-limit estricto (30/min) contra botting de apuestas
router.post('/bet', auth, limiterJuegos, validateBody(betDTO), controller.apostar);
router.get('/rounds', auth, controller.ultimasRondas);

export default router;
