---
tags: [datos, entidad]
---
# Outbox e Inbox · Entrega durable y deduplicación

## Estado actual

No existen tablas Outbox/Inbox en el esquema actual. Operation no sustituye por sí sola a un publicador durable.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Propuesto por servicio: Outbox(eventId,tenantId,tipo,version,aggregateId,aggregateVersion,payload,estado,intentos,createdAt). Inbox(consumer,eventId,tenantId,processedAt) con deduplicación dentro de la transacción que aplica el efecto.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Economia]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Guardar cambio y outbox juntos; marcar inbox junto al efecto. Validar esquema, emisor y tenant; definir orden por agregado, retención, reintentos y cola de fallos.

## Relaciones

[[cerebro/datos/entidades/Operation]] · [[cerebro/datos/entidades/Pago]] · [[cerebro/datos/entidades/Reserva y liquidacion]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
