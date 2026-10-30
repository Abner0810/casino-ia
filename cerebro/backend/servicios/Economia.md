---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 💰 Servicio Economía

**Actual:** wallet, transactions, operaciones y helpers de ledger comparten transacciones con juegos y pagos. **Objetivo:** mantenerlos como un límite contable único, dueño exclusivo de saldo y movimientos.

## Propiedad e invariantes

- Wallet por tenant–usuario; saldo y bono con Decimal y política monetaria explícita.
- Movimiento append-only y saldo se actualizan en la misma transacción local.
- Reservas, liquidaciones y operaciones locales persisten con claves idempotentes y alcance tenant.
- Reporting e historial permanecen inicialmente como consultas/proyecciones de este servicio.

No separar wallet y ledger en servicios distintos: se perdería su atomicidad local. El registro financiero no se elimina como compensación; una reversión crea un movimiento nuevo y trazable.

## Colaboraciones objetivo

[[cerebro/backend/servicios/Plinko|Plinko]], [[cerebro/backend/servicios/Blackjack|Blackjack]], [[cerebro/backend/servicios/Ruleta|Ruleta]] y [[cerebro/backend/servicios/Poker|Póker]] solicitan reserva, incremento autorizado y liquidación por contrato. Economía comprueba saldo, tenant, usuario y que una reserva no se liquide dos veces.

[[cerebro/backend/servicios/Pagos|Pagos]] comunica una confirmación autenticada y durable. Economía deduplica el evento y publica crédito confirmado; pago aceptado por Stripe y crédito en wallet son estados diferentes.

El esquema propio no tiene FK hacia User/Pago/partidas remotos. Conservar referencias externas y proyecciones mínimas cuando sean necesarias; ninguna consulta privada omite tenantId.

## SOLID y pruebas

SRP protege invariantes contables; ISP separa lectura de saldo, reserva y liquidación; DIP desacopla repositorios y canales. Outbox/inbox y saga son objetivos, no funcionalidades del monolito ya desplegadas.

Probar reservas concurrentes, saldo insuficiente, duplicados, mismo ID en tenants distintos, timeout tras commit, liquidación repetida y recuperación del proceso.

Fuentes: [ledger.js](../../../backend/src/shared/utils/ledger.js), [transaction.js](../../../backend/src/shared/transaction.js), [operations.js](../../../backend/src/shared/operations.js), [transaction.service.js](../../../backend/src/modules/transactions/transaction.service.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/SOLID]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Economia|Interfaz relacionada]] · [[cerebro/datos/entidades/Wallet]] · [[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Operation]] · [[cerebro/datos/entidades/Reserva y liquidacion]]
