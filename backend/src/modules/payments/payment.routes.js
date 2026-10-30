import { Router } from 'express';
import * as controller from './payment.controller.js';
import * as service from './payment.service.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { operationHandler } from '../../middlewares/operation.handler.js';
import { limiterPagos } from '../../middlewares/rateLimit.js';
import { checkoutDTO, pagoIdParamDTO } from './dto/payment.dto.js';
import { ApiError } from '../../shared/ApiError.js';

const router = Router();

// El usuario sale del token, nunca del body. Crear sesión es costoso:
// exige Idempotency-Key y tiene rate limit propio.
router.post('/checkout', auth, limiterPagos, validateBody(checkoutDTO), (req, res, next) => {
  const key = req.get('Idempotency-Key');
  if (!key || key.length > 128) return next(new ApiError(400, 'Idempotency-Key es obligatorio', undefined, 'IDEMPOTENCY_KEY_REQUIRED'));
  service.crearCheckout(req.user.id, req.body, {}, { idempotencyKey: key })
    .then((result) => {
      if (result._replayed) {
        res.set('Idempotency-Replayed', 'true');
      }
      const status = result._status || 201;
      const body = { ...result };
      delete body._status;
      delete body._replayed;
      res.status(status).json(body);
    })
    .catch(next);
});
router.get('/:id', auth, validateParams(pagoIdParamDTO), controller.consultar);
router.get('/:id/sync', auth, validateParams(pagoIdParamDTO), controller.sincronizar);
router.post('/:id/sync', auth, limiterPagos, validateParams(pagoIdParamDTO), controller.sincronizarPost);

// El webhook NO va aquí: se monta en app.js antes de express.json().
export default router;
