---
tags: [datos, objetivo]
estado: diseño propuesto
---
# Modelo relacional objetivo

PostgreSQL mantiene relaciones, restricciones, Decimal y transacciones locales. Los estados JSON de cartas no convierten el sistema en una base no relacional. El esquema vigente se explica en [[cerebro/datos/Entidades y relaciones]].

## Dominios propietarios

| Dueño | Tablas lógicas propuestas | Integridad |
| --- | --- | --- |
| Tenant | Tenant y configuración | Registro central; proyecciones locales donde hagan falta |
| Identidad | User, TenantMembership, RefreshToken | User global; membresía con tenantId; refresh ligado al tenant elegido |
| Economía | Wallet, Movimiento, Operation, Reserva, Liquidacion | ACID para saldo y ledger; tenantId obligatorio |
| Pagos | Pago, Operation, Outbox, Inbox | Estado del proveedor separado del crédito |
| Cada juego | Su ronda/partida, Operation, Outbox, Inbox | Resultado durable y versión; referencias económicas |

~~~mermaid
erDiagram
  TENANT_REFERENCE ||--o{ TENANT_MEMBERSHIP : referencia_local
  USER ||--o{ TENANT_MEMBERSHIP : pertenece
  TENANT_MEMBERSHIP ||--o{ REFRESH_TOKEN : autoriza
  WALLET ||--o{ MOVIMIENTO : registra
  WALLET ||--o{ RESERVA : bloquea_disponible
  RESERVA ||--o| LIQUIDACION : termina
  OPERATION ||--o{ MOVIMIENTO : correlaciona
~~~

El diagrama agrupa relaciones locales de dominios diferentes para lectura. **No propone FK entre servicios.** TenantReference en Identidad es una proyección local del registro Tenant. Las tablas de Economía referencian IDs externos lógicos con validación de contratos y, si corresponde, proyecciones locales.

## Restricciones objetivo

- Wallet: UNIQUE(tenantId,userId). TenantMembership: UNIQUE(tenantId,userId).
- Tablas privadas: tenantId NOT NULL; índices de consultas que comiencen con tenantId y continúen con usuario/fecha o estado según uso.
- Dentro de un servicio, una FK de recurso privado incluye tenantId y referencia una clave UNIQUE(tenantId,id); no permite cruzar organizaciones.
- Operation: UNIQUE(tenantId,actorId,key) en cada servicio; fingerprint incluye intención canónica y versión de contrato.
- Crédito externo: identificador de efecto único en Economía con ámbito de proveedor/cuenta/tenant; validar que un evento no cambie de tenant al reintentarse.
- User.email conserva identidad global; si se requiere email independiente por casino, es otra decisión y cambia login/recuperación.

El vínculo actual Movimiento.pagoId por FK no atraviesa el límite futuro Pagos/Economía: se sustituye por referencia externa y deduplicación económica. No se conservan joins remotos en peticiones de negocio.

Enlaces: [[cerebro/datos/Multitenancy]], [[cerebro/datos/Aislamiento RLS]], [[cerebro/datos/entidades/Reserva y liquidacion]], [[cerebro/datos/entidades/Outbox e Inbox]], [[cerebro/arquitectura/Migracion incremental]].

Fuente de partida: [schema.prisma](../../backend/prisma/schema.prisma). No se modificó el esquema ejecutable.
