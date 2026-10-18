import { Router } from 'express';
import * as controller from './wallet.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';

const router = Router();

// El usuario se deriva del token: nadie puede ver la billetera de otro
router.get('/', auth, controller.verSaldo);
router.get('/balance', auth, controller.verBalance);

export default router;
