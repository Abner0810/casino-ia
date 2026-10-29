---
tags: [datos, entidad]
---
# Operation · Intención idempotente

## Estado actual

Actual: UNIQUE(userId,key), fingerprint, nombre de operación, status y response JSON. Se guarda en la transacción de wallet.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo: deduplicación en cada servicio con UNIQUE(tenantId,actorId,key). Guardar estado de ejecución, fingerprint y respuesta según su protocolo; consultar al dueño. Gateway puede enrutar consultas, sin un lock global de operaciones.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Economia]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Misma clave e intención devuelve el mismo efecto; otro payload genera conflicto. Definir retención para que un reintento tardío no repita dinero.

## Relaciones

[[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
