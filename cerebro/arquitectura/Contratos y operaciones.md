---
tags: [arquitectura, api]
---
# 🔗 Contratos y operaciones

Los servicios de [[cerebro/frontend/Frontend|Frontend]] deben corresponder a rutas, DTOs y controladores del [[cerebro/backend/Backend|Backend]]. Un tipo TypeScript por sí solo no valida la respuesta en ejecución.

El helper `ejecutarOperacion` genera una UUID, envía `Idempotency-Key` y conserva la clave en los errores normalizados. `consultarOperacion` consulta `operations/:key`. Esto permite investigar una respuesta incierta sin generar una segunda operación con otra clave.

Conexiones críticas: [[cerebro/economia/Billetera y ledger|depósitos y retiros]], [[cerebro/economia/Pagos Stripe|checkout]], [[cerebro/juegos/Juegos|apuestas y acciones]], [[cerebro/seguridad/Seguridad y sesion|sesión]]. No asumir que cualquier endpoint admite el mismo mecanismo: comprobar su middleware.

Fuentes: [operations.ts](../../frontend/src/shared/api/operations.ts), [operation.routes.js](../../backend/src/modules/operations/operation.routes.js). Los contratos viven en `backend/src/modules/*/dto/` y los clientes en `frontend/src/features/`.

## Idempotencia en el servidor

`executeOperation` identifica operaciones por usuario y clave, compara un fingerprint del payload y conserva la respuesta. Una intención diferente con la misma clave genera conflicto. `userTransaction` bloquea la billetera para serializar operaciones del usuario.

Fuentes: [operations.js](../../backend/src/shared/operations.js), [transaction.js](../../backend/src/shared/transaction.js).
