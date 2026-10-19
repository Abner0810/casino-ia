import { Router } from 'express';
import * as controller from './transaction.controller.js';
import * as service from './transaction.service.js';
import { operationHandler } from '../../middlewares/operation.handler.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../../middlewares/validation.middleware.js';
import { depositDTO, withdrawDTO, historyQueryDTO } from './dto/transaction.dto.js';

const router = Router();

// Todo bajo auth: el userId SIEMPRE sale del token, nunca del body
router.post('/deposit', auth, validateBody(depositDTO), operationHandler('deposit', 201, (req) => service.depositar(req.user.id, req.body)));
router.post('/withdraw', auth, validateBody(withdrawDTO), operationHandler('withdraw', 200, (req) => service.retirar(req.user.id, req.body)));
router.get('/history', auth, validateQuery(historyQueryDTO), controller.historial);

export default router;
