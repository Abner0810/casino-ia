---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🟢 Microservicios

**Actual:** un monolito modular Express monta todos los módulos y comparte Prisma, PostgreSQL y transacciones. **Objetivo:** servicios con límites de negocio, despliegues y persistencia propios. Esta nota no declara una migración implementada.

| Servicio objetivo | Módulos de origen | Datos bajo su propiedad |
| --- | --- | --- |
| [[cerebro/backend/servicios/Tenant|Tenant]] | Nuevo | Tenant y configuración del operador |
| [[cerebro/backend/servicios/Identidad|Identidad]] | auth + users | User, TenantMembership, RefreshToken |
| [[cerebro/backend/servicios/Economia|Economía]] | wallet + transactions + ledger | Wallet, Movimiento, reservas, operaciones locales |
| [[cerebro/backend/servicios/Pagos|Pagos]] | payments | Pago, confirmación del proveedor |
| [[cerebro/backend/servicios/Plinko|Plinko]] | games/plinko | RondaPlinko |
| [[cerebro/backend/servicios/Blackjack|Blackjack]] | games/blackjack | PartidaBlackjack |
| [[cerebro/backend/servicios/Ruleta|Ruleta]] | games/roulette | RondaRuleta |
| [[cerebro/backend/servicios/Poker|Póker]] | games/poker | PartidaPoker |
| [[cerebro/backend/servicios/Gateway|Gateway]] | Entrada y composición nuevas | Sin saldo ni estado de partida |

## Reglas de separación

Cada servicio usa un esquema relacional y credencial propios; inicialmente pueden convivir en un clúster PostgreSQL. Ningún servicio escribe tablas ajenas ni ejecuta joins de negocio entre esquemas. Las FK se mantienen dentro del propietario; las referencias remotas viajan por contratos y eventos.

[[cerebro/datos/Multitenancy|Multitenancy]] añade tenant a recursos, autorizaciones, deduplicación y datos. La identidad es global y la pertenencia es por TenantMembership; la billetera pertenece al par tenant–usuario.

Economía es el único escritor del saldo y ledger. Separar juegos rompe la transacción local actual: usar reserva y liquidación idempotentes, estado duradero y recuperación mediante saga. Outbox/inbox es diseño futuro; no hay un broker instalado por esta documentación.

Los módulos operations se convierten en capacidad local de cada servicio; no crear un servicio global que bloquee todas las operaciones. Catálogo/acceso se compone inicialmente en Gateway; reporting permanece como proyección de Economía.

## Evidencia y navegación

Fuente actual: [app.js](../../backend/src/app.js), [schema.prisma](../../backend/prisma/schema.prisma), [transaction.js](../../backend/src/shared/transaction.js), [operations.js](../../backend/src/shared/operations.js).

Continuar: [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/frontend/Microfrontends]].
