---
tags: [arquitectura, patrones]
estado: Objetivo, no implementado
---
# Saga de apuesta y pago

## Evidencia

Los módulos actuales dependen de transacciones compartidas; extraerlos exige sustituir esa coordinación local.

Fuente: [transaction.js](../../../backend/src/shared/transaction.js).

## Uso en la arquitectura objetivo

Cada servicio de juego conserva una intención durable que coordina reserva en Economía, resultado persistido y liquidación. Persistir etapas, versiones, outbox y referencias económicas. Pagos coordina confirmación externa y crédito confirmado como pasos distintos.

## Límites

Compensar no es borrar historia. No liberar apuesta con resultado pendiente ni volver a sortear tras perder una respuesta. Las acciones de partidas largas necesitan reservas identificadas por acción.

## Verificación

Inyectar caídas en cada frontera y reanudar con la misma intención; conciliación encuentra reservas huérfanas sin acreditar dos veces.

[[cerebro/arquitectura/Consistencia distribuida]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
