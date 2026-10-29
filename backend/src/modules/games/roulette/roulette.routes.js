import { Router } from 'express';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody } from '../../../middlewares/validation.middleware.js';
import { operationHandler } from '../../../middlewares/operation.handler.js';
import { betDTO } from './dto/roulette.dto.js';
import * as service from './roulette.service.js';

const router = Router();
router.post('/bet', auth, limiterJuegos, validateBody(betDTO), operationHandler('roulette.bet', 201, (req) => service.apostar(req.user.id, req.body)));
router.get('/config', auth, (_req, res) => res.json(service.configuracion()));
router.get('/rounds', auth, async (req, res, next) => { try { res.json({ items: await service.ultimasRondas(req.user.id) }); } catch (error) { next(error); } });
export default router;
