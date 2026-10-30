---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🧩 Shell de plataforma

Hoy `app/`, `main.tsx` y el proveedor de sesión coordinan una única SPA. El objetivo es convertir ese punto de entrada en compositor de [[cerebro/frontend/Microfrontends|microfrontends]] con contratos explícitos.

## Responsabilidad y puertos

El shell administra el manifiesto permitido, el router raíz, layouts, navegación, fallback y errores de carga. Custodia tokens en memoria y una única renovación coordinada; los módulos reciben transporte autenticado, nunca access/refresh en eventos.

- `SessionPort`: identidad pública, login/logout mediante capacidades controladas y notificación de cambio.
- `TenantPort`: contexto verificado y generación de sesión; el servidor autoriza cada petición.
- `NavigationPort`: prefijo de rutas y navegación sin anidar routers raíz.
- `HttpPort`: transporte cancelable, errores normalizados e idempotencia cuando el contrato lo exige.
- `MoneyEventsPort`: avisos tipados para invalidar consultas, sin saldo como autoridad.

## Montaje y aislamiento

Cada entrada ESM implementa `mount(element, context)` y devuelve limpieza. El contexto contiene versión, puertos mínimos y señal de cancelación; no contiene el QueryClient ni el store privado del shell. Cada microfrontend administra su caché con `tenantId` y `userId`.

Un cambio de tenant o logout incrementa la generación de contexto, aborta solicitudes, desmonta módulos y exige limpiar sus cachés. Una respuesta de una generación anterior se descarta antes de actualizar la interfaz. Un fallo de carga muestra fallback local y conserva navegación segura.

## Criterios de migración

Probar montaje/desmontaje repetido, contrato incompatible, URL no permitida, refresh concurrente, logout y cambio de tenant con una consulta pendiente. Los artefactos deben ser versionados y permitir rollback por módulo.

Relaciones: [[cerebro/frontend/microfrontends/Identidad y perfil]], [[cerebro/frontend/microfrontends/Economia]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [main.tsx](../../../frontend/src/main.tsx), [session.provider.tsx](../../../frontend/src/features/auth/session.provider.tsx), [http.ts](../../../frontend/src/shared/api/http.ts), [App.tsx](../../../frontend/src/app/App.tsx).

## Dependencia de dominio

[[cerebro/backend/servicios/Tenant]] · [[cerebro/datos/entidades/Tenant]]
