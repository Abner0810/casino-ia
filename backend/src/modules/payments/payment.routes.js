import { Router } from 'express';
import * as controller from './payment.controller.js';
import * as service from './payment.service.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { operationHandler } from '../../middlewares/operation.handler.js';
import { limiterPagos } from '../../middlewares/rateLimit.js';
import { checkoutDTO, pagoIdParamDTO } from './dto/payment.dto.js';

const router = Router();

// El usuario sale del token, nunca del body. Crear sesión es costoso:
// exige Idempotency-Key y tiene rate limit propio.
router.post('/checkout', auth, limiterPagos, validateBody(checkoutDTO),
  operationHandler('payments_checkout', 201, (req) => service.crearCheckout(req.user.id, req.body)));
router.get('/:id', auth, validateParams(pagoIdParamDTO), controller.consultar);
router.get('/:id/sync', auth, validateParams(pagoIdParamDTO), controller.sincronizar);

// El webhook NO va aquí: se monta en app.js antes de express.json().
export default router;
