import { Router } from 'express';
import * as controller from './auth.controller.js';
import { validateBody } from '../../middlewares/validation.middleware.js';
import { limiterAuth } from '../../middlewares/rateLimit.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { registerDTO, loginDTO, refreshDTO, logoutDTO } from './dto/auth.dto.js';

const router = Router();

// Públicas con rate-limit estricto (10/min) contra fuerza bruta
router.post('/register', limiterAuth, validateBody(registerDTO), controller.register);
router.post('/login', limiterAuth, validateBody(loginDTO), controller.login);
router.post('/refresh', limiterAuth, validateBody(refreshDTO), controller.refresh);

// Logout requiere auth: solo un usuario autenticado puede revocar su sesión
router.post('/logout', auth, validateBody(logoutDTO), controller.logout);

export default router;
