---
tags: [datos, entidad]
---
# PartidaPoker · Estado de Texas Hold’em

## Estado actual

Actual: apuesta, apuestaTotal, estado, modalidad, fase, cartas, banca, comunitarias, baraja, resultado, ganancia, versión y fechas. VIDEO_POKER permanece como valor legado del esquema.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Poker: tenantId, versión y correlación de reservas por incremento de apuesta. No exponer mazo ni cartas de banca antes de tiempo. La modalidad principal actual es Texas Hold’em contra banca, no multijugador.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Poker]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Check/raise/fold conservan transiciones válidas y el coste de raise se confirma una vez.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/Reserva y liquidacion]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
