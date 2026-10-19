import { Router } from 'express';
import { prisma } from '../../shared/prisma.client.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { ApiError } from '../../shared/ApiError.js';

const router = Router();
router.get('/:key', auth, async (req, res, next) => {
  try {
    const operation = await prisma.operation.findUnique({
      where: { userId_key: { userId: req.user.id, key: req.params.key } },
      select: { id: true, operation: true, status: true, response: true, createdAt: true },
    });
    if (!operation) throw new ApiError(404, 'Operación no encontrada');
    res.json({ ...operation, estado: 'CONFIRMADA' });
  } catch (err) { next(err); }
});
export default router;
