---
tags: [datos, entidad]
---
# PartidaBlackjack · Estado de Blackjack

## Estado actual

Actual: apuesta, estado, baraja, dealer, manos, resultado, fechas y versión. JSON permite guardar el estado dentro de PostgreSQL.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Blackjack: tenantId, referencias a reservas y liquidaciones por acción. La restricción de partida activa se evalúa por tenant+usuario; control de versión y cartas ocultas sigue siendo del servidor.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Blackjack]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Acciones concurrentes con la misma versión no se aplican dos veces; recuperar partida nunca revela baraja o carta oculta.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/Reserva y liquidacion]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
