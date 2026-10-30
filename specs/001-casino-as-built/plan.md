# Plan as-built: Casino IA actual

**Feature identifier**: `001-casino-as-built` | **Checkout Git**: `feat/poker-bots-15-names` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Inventario descriptivo del estado actual, sustentado en el código local, pruebas y documentación revisados.

> Este plan registra cómo está compuesto el sistema hoy. No propone arquitectura, tareas de desarrollo ni modificaciones.

## Summary

Casino IA funciona en el repositorio como una aplicación web SPA React/TypeScript/Vite y una API Express modular en JavaScript, con PostgreSQL accedido mediante Prisma. El frontend enruta pantallas públicas y privadas, conserva la sesión en memoria y consume la API mediante un cliente HTTP central. El backend monta módulos de autenticación, perfil, billetera, movimientos, operaciones, pagos y cuatro juegos. El backend decide resultados y cambios de saldo; las operaciones que usan el ledger registran saldo y movimiento dentro de transacciones.

Stripe Checkout está integrado en modo de prueba y el saldo solo se acredita después de una confirmación del servidor que valida el pago. La existencia de código y configuración no demuestra disponibilidad remota. Este artefacto diferencia comportamiento respaldado por código de pruebas existentes, informes históricos y estado remoto no confirmado.

## Technical Context

Estos valores describen manifiestos y configuración locales; no son una propuesta tecnológica.

**Language/Version**: Backend JavaScript ES modules sobre Node.js `>=22`; frontend TypeScript sobre Node.js `>=22.12` (rangos declarados en los manifiestos).

**Primary Dependencies**: Frontend React, Vite, React Router, TanStack Query, React Hook Form, Zod, CSS Modules, Vitest y Playwright. Backend Express, Prisma, PostgreSQL, Zod, JWT, bcryptjs, Argon2 y Stripe SDK. Las versiones instaladas se fijan en los lockfiles; los rangos declarados constan en `frontend/package.json` y `backend/package.json`.

**Storage**: PostgreSQL mediante Prisma. Dinero representado con Decimal; algunas partidas guardan estado de juego como JSON. Los tokens refresh se persisten como hash.

**Testing**: Backend `node:test` (unitarios, smoke HTTP, integración y E2E); contrato OpenAPI validado por Swagger Parser. Frontend Vitest/Testing Library y Playwright. La presencia de estos tests no certifica una ejecución actual; la E2E de frontend intercepta la API y el checkout.

**Target Platform**: API Node.js y SPA para navegadores. Firebase Hosting y Render están presentes en archivos/documentos; la salud remota actual no se verificó para esta ficha.

**Project Type**: Aplicación web con SPA y API en un monolito modular; el repositorio no evidencia microservicios ni microfrontends en ejecución.

**Performance Goals**: No se encontraron objetivos medidos de latencia, throughput o disponibilidad. El backend sí declara límites de frecuencia: general 100 solicitudes/minuto por IP; auth 10/minuto; juegos 30/minuto; creación de checkout 10/minuto. El limitador es por proceso, no distribuido entre réplicas (`backend/README.md`).

**Constraints**: Tokens del navegador solo en memoria; respuestas y saldos monetarios provienen del backend; recursos privados se resuelven por usuario autenticado. Las mutaciones que pasan por `operationHandler` requieren clave idempotente; el cliente no reintenta automáticamente una mutación ante resultado incierto. Variables `VITE_*` son públicas.

**Scale/Scope**: El alcance funcional local incluye registro/login, perfil, billetera, movimientos, pagos de prueba y cuatro juegos. No se especifican volumen de usuarios, carga, retención, SLA ni objetivos de escalado.

## Constitution Check

| Principio | Estado del inventario as-built |
|---|---|
| Stack y versiones actuales | Conforme: se describen desde los package manifests y lockfiles; no se propone cambio. |
| Servidor como autoridad de saldo/resultados | Conforme: las rutas y servicios delegan resultados y liquidación al backend. |
| Validación contractual | Brecha observada: las rutas revisadas que aplican validadores Zod validan body, params o query mediante DTOs; `GET /api/operations/:key` no aplica `validateParams` ni un DTO explícito al parámetro `key` (`backend/src/modules/operations/operation.routes.js`). Esto contradice el alcance universal del principio III para esa ruta; se documenta el comportamiento local sin afirmar conformidad general. |
| Idempotencia y resultados inciertos | Documentado con alcance: middleware idempotente en rutas seleccionadas; frontend sin retries automáticos de mutaciones ante timeout/red/5xx. No se generaliza a todas las rutas. |
| Secretos y sesión | Conforme al diseño local: `VITE_*` público; access/refresh del browser en memoria; secretos de backend validados desde entorno. |
| Aislamiento por usuario | Conforme en las rutas revisadas: ID interno deriva de Bearer y consultas de recursos incluyen propiedad. El proyecto no es multitenant. |
| Accesibilidad y estados de UI | Parcial como garantía: hay estados y soporte de movimiento reducido, además de pruebas puntuales. No hay certificación WCAG ni verificación exhaustiva documentada. |
| Pruebas | Evidencia de suites presentes y resultados históricos documentados; no se ejecutaron para crear este plan. |
| Flujo y autorización de entrega | Documentado como regla. Este trabajo no cambia rama, no hace push/PR/deploy. La publicación remota actual no se infiere de configuración. |
| Cambios pequeños y compatibles | Conforme: artefactos de documentación describen el sistema existente, sin alterar contratos. |

La constitución contiene un `TODO(RATIFICATION_DATE)` por confirmar. No bloquea la descripción técnica, pero el documento aún espera ratificación formal del equipo.

## Project Structure

### Documentación de esta ficha

```text
specs/001-casino-as-built/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-local.md
└── checklists/
    └── requirements.md
```

### Estructura real relevante del producto

```text
backend/
├── prisma/                 # schema, migraciones y cliente generado
├── src/
│   ├── app.js               # middleware, webhook y montaje de módulos
│   ├── config/              # env, CORS
│   ├── middlewares/         # auth, validación, operaciones, límites y errores
│   ├── modules/
│   │   ├── auth/ users/ wallet/ transactions/ operations/ payments/
│   │   └── games/{plinko,blackjack,roulette,poker}/
│   └── shared/              # transacciones, dinero, ledger y operaciones
└── tests/                   # node:test, smoke HTTP e integración

frontend/
├── src/
│   ├── app/                 # router, layouts y guard de rutas privadas
│   ├── features/            # auth, profile, wallet, transactions y juegos
│   ├── shared/api/          # cliente HTTP, claves de consulta y operaciones
│   └── shared/ui/           # controles y componentes compartidos
└── e2e/                     # recorridos Playwright
```

**Structure Decision**: Se mantiene la división ya existente `backend/` + `frontend/`. Cada backend module contiene rutas, DTOs, controladores/servicios y repositorios según el módulo; frontend organiza rutas y pantallas por feature y comparte cliente API, hooks y componentes. La separación es de código dentro del mismo producto; no significa despliegues independientes.

## Flujos y conexiones comprobados en código

1. **Solicitud web**: `frontend/src/app/App.tsx` define rutas; las features llaman `frontend/src/shared/api/http.ts`; Express aplica Helmet, CORS, request ID, parser JSON y rate limit en `backend/src/app.js`; el router correspondiente valida, autentica y pasa al servicio.
2. **Sesión**: registro no crea sesión automática. Login entrega access/refresh; el store frontend los guarda en memoria. Refresh rota ambos tokens; logout limpia caché/solicitudes y pide revocación. Recargar el navegador pierde sesión local.
3. **Propiedad**: middleware Bearer coloca usuario en `req.user`; servicios usan ese ID y verifican ownership para partidas/pagos. El rol `ADMIN` está en el esquema, pero no se observó API/pantalla de administración.
4. **Saldo**: `userTransaction` coordina acceso transaccional por usuario. `debitar`/`acreditar` usan Decimal, actualizan Wallet y crean Movimiento dentro de la misma transacción. Un débito con saldo insuficiente rechaza la operación.
5. **Operaciones inciertas**: `operationHandler` envuelve rutas seleccionadas, exige `Idempotency-Key`, almacena fingerprint/respuesta y permite consultar por clave. `frontend/src/shared/api/operations.ts` retiene la clave fallida; el cliente HTTP no reintenta mutaciones automáticamente.
6. **Juegos**: el frontend envía apuesta/acción; el backend valida y genera resultado, actualiza partida/ronda y ledger. La interfaz presenta la respuesta del servidor y refresca datos relacionados.
7. **Stripe Checkout**: checkout autenticado crea pago y sesión alojada; retorno de browser requiere sesión y consulta estado. El webhook se monta con cuerpo raw antes de JSON, valida firma y delega confirmación; `/sync` consulta la sesión al proveedor. El servicio solo acredita tras comprobar estado, monto, moneda y referencias.
8. **Despliegue/health**: `/health` consulta PostgreSQL y responde estado de API/DB. Los workflows/configuraciones no son evidencia de que el SHA local esté desplegado ni de que el servicio esté sano ahora.

## Limitaciones y pendientes de evidencia

- Los documentos históricos tienen fechas y alcances previos a Ruleta, Poker y checkout. La ficha da preferencia al código local y marca discrepancias.
- La descripción de `backend/package.json` todavía identifica la API como “Plinko + Blackjack”; `backend/src/app.js` monta además Ruleta, Poker, operaciones y pagos. Se trata como metadato histórico del paquete, no como inventario funcional.
- `backend/src/app.js` registra request ID, duración y estado HTTP en logs de producción, y limita JSON a 100 KB y el cuerpo raw del webhook a 256 KB. No se hallaron objetivos cuantificados de rendimiento, disponibilidad, escala o cumplimiento.
- `frontend/src/shared/api/http.ts` fija timeout de 20 segundos; `frontend/src/app/providers.tsx` no reintenta mutaciones y limita reintentos de consultas recuperables. El soporte `prefers-reduced-motion` está presente en estilos y hook compartido.
- `backend/README.md` registra verificación local histórica del 19 de octubre de 2026 con Node 22/PostgreSQL 18: 11 pruebas de lógica/contrato, 19 escenarios de integración, siete checks smoke y health 200. El mismo documento aclara que no verifica despliegue remoto. `ai-context/comparacion-frontend.md` registra 33 Vitest y ocho Playwright, estos últimos con API interceptada; tampoco son certificación WCAG ni verificación de pago remoto.
- El último registro citado sobre Render es de fecha anterior; no se verificó la URL remota durante este trabajo.
- Playwright usa API interceptada para recorridos UI; no demuestra integración real con DB, Render ni Stripe.
- No se especifican targets de carga, disponibilidad, retención, recuperación, cumplimiento regulatorio ni telemetría operacional más allá de request ID y logs presentes.
- La accesibilidad no se presenta como certificada; se verificaron en documentos algunas pruebas de viewport/teclado y uso de movimiento reducido.
- Las notas de microservicios, multitenancy/RLS, microfrontends, outbox/inbox y arquitectura distribuida son objetivos/notas propuestas, no estructura observada del runtime.
- No se ejecutaron pruebas, migraciones, despliegues ni peticiones a servicios externos durante la elaboración de este inventario.

## Complexity Tracking

No aplica: este documento no introduce proyectos, capas, dependencias ni complejidad nueva.
