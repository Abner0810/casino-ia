import { Router } from 'express';
import * as controller from './transaction.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../../middlewares/validation.middleware.js';
import { depositDTO, withdrawDTO, historyQueryDTO } from './dto/transaction.dto.js';

const router = Router();

// Todo bajo auth: el userId SIEMPRE sale del token, nunca del body
router.post('/deposit', auth, validateBody(depositDTO), controller.depositar);
router.post('/withdraw', auth, validateBody(withdrawDTO), controller.retirar);
router.get('/history', auth, validateQuery(historyQueryDTO), controller.historial);

export default router;
