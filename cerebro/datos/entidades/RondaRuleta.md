---
tags: [datos, entidad]
---
# RondaRuleta · Resultado de Ruleta

## Estado actual

Actual: apuesta, tipo, selección, número, multiplicador, ganancia y fecha asociados a User.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Ruleta: tenantId, intención y reservas/liquidación correlacionadas. Resultado 0–36 durable antes de publicar; reglas y límites públicos versionados.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Ruleta]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Resultado persistido y pago mantienen identidad aunque se pierda la respuesta de una apuesta.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/Reserva y liquidacion]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
