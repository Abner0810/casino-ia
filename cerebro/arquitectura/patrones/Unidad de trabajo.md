---
tags: [arquitectura, patrones]
estado: Actual local; rediseño al distribuir
---
# Transacción y Unit of Work

## Evidencia

shared/transaction usa AsyncLocalStorage para compartir tx, comprueba usuario y bloquea Wallet con FOR UPDATE. ledger actualiza monto y movimiento en esa transacción.

Fuente: [transaction.js](../../../backend/src/shared/transaction.js).

## Uso en la arquitectura objetivo

Conservar saldo, movimiento, reserva, inbox y outbox de Economía dentro de su transacción local. Al separar servicios, cada uno controla su commit; una saga coordina los pasos sin transacción SQL compartida.

## Límites

No mantener un lock de billetera mientras se espera un proveedor externo en el diseño objetivo. El rollback de PostgreSQL no cancela una sesión Stripe ya creada.

## Verificación

Fallo antes de commit no deja saldo sin movimiento; caída después de commit conserva el outbox para continuar. Contención entre usuarios/tenants no crea locks globales.

[[cerebro/arquitectura/Consistencia distribuida]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
