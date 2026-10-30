---
tags: [datos, entidad]
---
# RondaPlinko · Resultado persistido de Plinko

## Estado actual

Actual: userId, apuesta, riesgo, multiplicador, ganancia, seed, rutaBola y fecha.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Plinko: tenantId, intención, reserva y referencia de liquidación. Persistir resultado y outbox localmente. Semilla y detalles internos se mantienen bajo control del servidor, con exposición solo mediante contrato explícito.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Plinko]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Una caída después del sorteo no crea otro resultado ni liquida dos veces.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/Reserva y liquidacion]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
