import { Router } from 'express';
import * as controller from './user.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { updateProfileDTO, accesoJuegoDTO } from './dto/user.dto.js';

const router = Router();

// Todos los recursos propios se derivan del token: cero IDs del cliente
router.get('/profile', auth, controller.verPerfil);
router.patch('/profile', auth, validateBody(updateProfileDTO), controller.editarPerfil);
router.post('/games/:juego/access', auth, validateParams(accesoJuegoDTO), controller.accesoJuego);

export default router;
