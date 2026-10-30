---
tags: [arquitectura, actual]
---
# Estado actual comprobado

Revisión de archivos locales: 29 de octubre de 2026. No se ejecutó una migración ni se verificó un despliegue remoto en esta revisión.

| Área | Evidencia actual | Evolución requerida |
| --- | --- | --- |
| Backend | Un buildApp de Express monta diez módulos; Prisma compartido | [[cerebro/backend/Microservicios|Microservicios]] independientes |
| Frontend | Un createRoot, BrowserRouter y build Vite; juegos lazy | [[cerebro/frontend/Microfrontends|Microfrontends]] con composición y releases |
| Datos | PostgreSQL, claves foráneas, Decimal y JSON para partidas | [[cerebro/datos/Multitenancy|Multitenancy]] y propiedad por servicio |
| Aislamiento | Ownership por usuario, sin tenantId ni Tenant en Prisma | Contexto tenant, membresía, claves compuestas y RLS |
| Atomicidad | Wallet, partidas, operaciones y ledger comparten transacción | [[cerebro/arquitectura/Consistencia distribuida|Consistencia distribuida]] |

Separar carpetas o usar lazy loading no demuestra independencia de ejecución y despliegue. La base actual no incluye outbox/inbox ni un broker distribuido.

La separación en capas es parcial: auth.service, payment.service y operations/operation.routes contienen accesos directos a Prisma. No se puede afirmar que todos los accesos estén encapsulados en repositorios ni que SOLID esté completamente aplicado.

Fuentes: [app.js](../../backend/src/app.js), [schema.prisma](../../backend/prisma/schema.prisma), [main.tsx](../../frontend/src/main.tsx), [vite.config.ts](../../frontend/vite.config.ts), [queryKeys.ts](../../frontend/src/shared/api/queryKeys.ts).

Siguiente: [[cerebro/arquitectura/Arquitectura objetivo]] y [[cerebro/arquitectura/Migracion incremental]].
