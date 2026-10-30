---
tags: [datos, entidad]
---
# Movimiento · Ledger de dinero

## Estado actual

Actual: monto positivo, tipo, saldoAntes, saldoDespues, juego, descripción, fecha, operationId opcional y pagoId opcional único.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Economía: tenantId obligatorio, walletId local con FK compuesta y referencias externas de pago/partida. Saldo y movimiento cambian en una misma transacción; compensaciones agregan nuevos movimientos y no borran historia.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Economia]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Reconciliar saldo y secuencia; definir retención y borrado de identidad sin destruir ledger. Las cascadas del esquema actual requieren revisión antes de prometer inmutabilidad técnica.

## Relaciones

[[cerebro/datos/entidades/Wallet]] · [[cerebro/datos/entidades/Operation]] · [[cerebro/datos/entidades/Pago]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
