---
tags: [datos, entidad]
---
# Reserva y liquidacion · Garantía económica de apuestas

## Estado actual

No existen entidades separadas de reserva/liquidación en el esquema actual: los juegos debitan y acreditan mediante transacciones compartidas.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Propuesto en Economía: Reserva con tenantId,walletId,intentionId,importe,estado y versión. Liquidacion con reservaId,resultadoRef,importe de devolución/premio y clave de efecto única. Disponible = saldo menos reservas vigentes según política contable explícita.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Economia]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Definir estados RESERVADA, LIQUIDADA y LIBERADA con transiciones condicionales. Vencimiento solo si el protocolo confirma que no hay resultado pendiente; no liberar por una desconexión del navegador.

## Relaciones

[[cerebro/datos/entidades/Wallet]] · [[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
