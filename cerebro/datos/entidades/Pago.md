---
tags: [datos, entidad]
---
# Pago · Intento de pago externo

## Estado actual

Actual: monto, moneda, estado, sesión Stripe única, paymentIntent único opcional, fechas y vínculo con movimiento. Estados PENDIENTE, PAGADO, FALLIDO, EXPIRADO.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Pagos: tenantId y ámbito de cuenta del proveedor, clave estable para checkout y evento durable de confirmación. PAGADO significa proveedor confirmado; crédito económico pendiente/confirmado es otro estado correlacionado. No escribir Wallet remotamente.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Pagos]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Webhook firmado y conciliación validan importe, moneda, referencia y tenant. Duplicados no producen otro crédito. Un rollback SQL no revierte un checkout externo.

## Relaciones

[[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Operation]] · [[cerebro/datos/entidades/Outbox e Inbox]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
