import { Router } from 'express';
import { auth } from '../../../middlewares/auth.middleware.js';
import { limiterJuegos } from '../../../middlewares/rateLimit.js';
import { validateBody, validateParams } from '../../../middlewares/validation.middleware.js';
import { operationHandler } from '../../../middlewares/operation.handler.js';
import { startDTO, actionDTO, partidaParamsDTO } from './dto/poker.dto.js';
import * as service from './poker.service.js';

const router = Router();
const manejar = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (error) { next(error); } };
router.post('/start', auth, limiterJuegos, validateBody(startDTO), operationHandler('poker.start', 201, (req) => service.iniciar(req.user.id, req.body)));
router.get('/config', auth, (_req, res) => res.json(service.configuracion()));
router.get('/rounds', auth, manejar(async (req) => ({ items: await service.obtenerRondas(req.user.id) })));
router.get('/active', auth, manejar((req) => service.obtenerActiva(req.user.id)));
router.get('/:id', auth, validateParams(partidaParamsDTO), manejar((req) => service.consultar(req.user.id, req.params.id)));
router.post('/:id/action', auth, limiterJuegos, validateParams(partidaParamsDTO), validateBody(actionDTO), operationHandler('poker.action', 200, (req) => service.actuar(req.user.id, req.params.id, req.body)));
export default router;
