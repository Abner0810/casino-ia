---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 💰 Microfrontend de economía

Hoy billetera, movimientos y pagos comparten la SPA. Se propone mantenerlos juntos en una unidad para reducir contratos cruzados de saldo, filtros y retorno de checkout.

## Módulos incluidos

- `/billetera`: saldo, bono separado, balance, recarga y retiro simulados según contrato.
- `/movimientos`: historial, filtros, fechas y paginación.
- `/billetera/retorno`: consulta y conciliación del pago de prueba.

La unidad recibe transporte autenticado e idempotencia de [[cerebro/frontend/microfrontends/Shell|Shell]]. No importa el QueryClient de otro microfrontend ni conserva una segunda sesión. Saldo, crédito y premios los decide el servidor.

## Confirmación de dinero

Mantiene la clave de una operación de resultado incierto para consultarla; no reenvía automáticamente depósitos, retiros o checkout. El retorno del navegador no confirma un pago. La URL de salida debe cumplir la política del checkout alojado y el crédito requiere estado confirmado por backend.

El aviso `wallet.changed.v1` lleva identidad de contexto y una referencia de cambio, nunca tokens ni un saldo a aplicar. [[cerebro/frontend/microfrontends/Inicio y lobby|Inicio]] y juegos invalidan sus lecturas. Cada caché incluye tenant, usuario, recurso y filtros.

## Verificación objetivo

Probar doble envío, timeout tras confirmación, consulta por clave, saldo insuficiente, filtros y teclado. En retorno de Stripe, reautenticar si se perdió la sesión en memoria y comprobar que pago y tenant corresponden al usuario antes de mostrarlo.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/economia/Billetera y ledger]], [[cerebro/economia/Pagos Stripe]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [wallet.api.ts](../../../frontend/src/features/wallet/wallet.api.ts), [movimientos.api.ts](../../../frontend/src/features/transactions/movimientos.api.ts), [RetornoPagoPage.tsx](../../../frontend/src/features/wallet/pages/RetornoPagoPage.tsx), [operations.ts](../../../frontend/src/shared/api/operations.ts).

## Dependencia de dominio

[[cerebro/backend/servicios/Economia]] · [[cerebro/datos/entidades/Wallet]] · [[cerebro/datos/entidades/Movimiento]] · [[cerebro/datos/entidades/Operation]] · [[cerebro/datos/entidades/Reserva y liquidacion]]

## Integración con Pagos

[[cerebro/backend/servicios/Pagos]] · [[cerebro/datos/entidades/Pago]] · [[cerebro/datos/entidades/Outbox e Inbox]]
