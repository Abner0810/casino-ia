---
tags: [datos]
---
# Entidades y relaciones

Inventario contrastado con [schema.prisma](../../backend/prisma/schema.prisma). Los nombres existentes se mantienen; las notas indican cambios propuestos y dueños futuros.

| Entidad | Estado | Nota |
| --- | --- | --- |
| User | Actual; global en el objetivo | [[cerebro/datos/entidades/User]] |
| Tenant | Nueva | [[cerebro/datos/entidades/Tenant]] |
| TenantMembership | Nueva | [[cerebro/datos/entidades/TenantMembership]] |
| Wallet | Actual; añadir alcance tenant | [[cerebro/datos/entidades/Wallet]] |
| Movimiento | Actual; ledger | [[cerebro/datos/entidades/Movimiento]] |
| Operation | Actual; deduplicación local futura | [[cerebro/datos/entidades/Operation]] |
| Pago | Actual; dueño Pagos | [[cerebro/datos/entidades/Pago]] |
| RefreshToken | Actual; ligar tenant en objetivo | [[cerebro/datos/entidades/RefreshToken]] |
| RondaPlinko | Actual | [[cerebro/datos/entidades/RondaPlinko]] |
| PartidaBlackjack | Actual | [[cerebro/datos/entidades/PartidaBlackjack]] |
| RondaRuleta | Actual | [[cerebro/datos/entidades/RondaRuleta]] |
| PartidaPoker | Actual | [[cerebro/datos/entidades/PartidaPoker]] |
| Outbox / Inbox | Nuevas | [[cerebro/datos/entidades/Outbox e Inbox]] |
| Reserva / Liquidación | Nuevas | [[cerebro/datos/entidades/Reserva y liquidacion]] |

## Relaciones actuales

User tiene Wallet opcional en Prisma y colecciones de movimientos, tokens, operaciones, pagos y cuatro tipos de ronda/partida. El registro crea billetera. Operation puede tener varios movimientos; Pago se asocia con un movimiento mediante vínculo opcional único. Hoy todas son relaciones en un esquema compartido.

La migración separa esas FK por propietario y añade [[cerebro/datos/Multitenancy|tenant]]. No convertir relaciones del monolito en joins entre bases de microservicios.

Ver [[cerebro/datos/Modelo relacional objetivo]] y [[cerebro/backend/Microservicios]].
