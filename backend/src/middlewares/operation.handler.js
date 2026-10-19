import { z } from 'zod';
import { ApiError } from '../shared/ApiError.js';
import { executeOperation } from '../shared/operations.js';

const keyDTO = z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const operationHandler = (operation, status, fn, { versioned = false } = {}) => async (req, res, next) => {
  try {
    const key = keyDTO.safeParse(req.get('Idempotency-Key'));
    if (!key.success) throw new ApiError(400, 'Idempotency-Key es obligatorio (8–128 caracteres alfanuméricos, _ o -)', undefined, 'INVALID_IDEMPOTENCY_KEY');
    if (versioned && !z.number().int().nonnegative().safeParse(req.body?.version).success) {
      throw new ApiError(400, 'version debe ser un entero no negativo', undefined, 'INVALID_VERSION');
    }
    const result = await executeOperation(req.user.id, key.data, operation, {
      params: req.params, body: req.body,
    }, status, async (tx) => {
      if (versioned) {
        const partida = await tx.partidaBlackjack.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!partida) throw new ApiError(404, 'Partida no encontrada');
        if (partida.version !== req.body.version) throw new ApiError(409, 'La partida cambió. Consulta su estado actual.', undefined, 'STALE_VERSION');
      }
      return fn(req);
    });
    res.set('Idempotency-Replayed', String(result.replayed));
    res.status(result.status).json(result.body);
  } catch (err) { next(err); }
};
