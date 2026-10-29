---
tags: [datos, entidad]
---
# Wallet · Billetera

## Estado actual

Actual: userId único, saldo y bono Decimal(12,2), updatedAt; relación uno a uno opcional desde User.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Economía: una billetera por (tenantId,userId), saldo y reservas separados para calcular disponible sin descontar dos veces. Solo Economía escribe; referencias a usuario son lógicas o proyecciones locales, sin FK remota.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Economia]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Pruebas concurrentes evitan saldo negativo, doble reserva y filtración entre billeteras de la misma cuenta en dos tenants.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Reserva y liquidacion]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
