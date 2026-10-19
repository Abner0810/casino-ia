import { createHash } from 'node:crypto';
import { ApiError } from './ApiError.js';
import { userTransaction, currentTransaction } from './transaction.js';

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export async function executeOperation(userId, key, operation, payload, status, fn) {
  const fingerprint = createHash('sha256').update(JSON.stringify(canonical({ operation, payload }))).digest('hex');
  return userTransaction(userId, async (tx) => {
    const previous = await tx.operation.findUnique({ where: { userId_key: { userId, key } } });
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ApiError(409, 'La clave ya corresponde a otra solicitud', undefined, 'IDEMPOTENCY_CONFLICT');
      return { status: previous.status, body: previous.response, replayed: true };
    }
    const record = await tx.operation.create({ data: { userId, key, fingerprint, operation, status, response: {} } });
    currentTransaction().operationId = record.id;
    const body = JSON.parse(JSON.stringify(await fn(tx)));
    body.operationId = record.id;
    await tx.operation.update({ where: { id: record.id }, data: { response: body } });
    return { status, body, replayed: false };
  });
}
