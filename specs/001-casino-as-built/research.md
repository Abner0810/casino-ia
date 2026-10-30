# Research as-built: evidencia y límites

**Ficha**: [spec.md](spec.md) · **Plan descriptivo**: [plan.md](plan.md)

## Método

La revisión compara el código local, los contratos declarados, las pruebas presentes y documentación con fecha. No se consultaron servicios remotos ni se ejecutaron pruebas durante esta tarea. Los archivos de `cerebro/` que describen arquitectura objetivo se separan del runtime actual.

## Hechos observados

| Tema | Hecho documentado | Evidencia |
|---|---|---|
| Forma de ejecución | Un `buildApp` Express monta los módulos; un SPA React monta rutas mediante BrowserRouter. | `backend/src/app.js`, `frontend/src/main.tsx`, `frontend/src/app/App.tsx`, `cerebro/arquitectura/Estado actual.md` |
| Persistencia | Prisma usa PostgreSQL; wallet y ledger utilizan Decimal y las entidades de rondas/partidas pertenecen a usuario. | `backend/prisma/schema.prisma`, `backend/src/shared/utils/ledger.js` |
| Seguridad de sesión | Bearer JWT y refresh rotativo en backend; frontend guarda tokens en memoria. | `backend/src/modules/auth/`, `backend/src/middlewares/auth.middleware.js`, `frontend/src/features/auth/`, `frontend/src/shared/api/http.ts` |
| Economía | Depósitos simulados están limitados por entorno; retiro es simulado; movimientos reflejan saldo. | `backend/src/modules/transactions/`, `backend/src/modules/wallet/`, DTOs y helper ledger |
| Checkout | Código Stripe test requiere clave `sk_test_`, moneda servidor `bob`, webhook firmado o sync; acredita tras verificar detalles. | `backend/src/config/env.js`, `backend/src/modules/payments/`, tests `backend/tests/payments.test.js` |
| Juegos | Están montados Plinko, Blackjack, Ruleta europea y Texas Hold’em con servicios separados dentro de la API. | `backend/src/app.js`, `backend/src/modules/games/`, `frontend/src/app/App.tsx`, `frontend/src/features/games/` |
| Idempotencia | Middleware de operación y consulta por usuario/clave existen para rutas seleccionadas, no se presume universalidad. | `backend/src/middlewares/operation.handler.js`, `backend/src/shared/operations.js`, `backend/src/modules/operations/operation.routes.js` |
| QA | Hay pruebas unitarias, de contrato, integración, smoke, frontend y Playwright. E2E navegador intercepta API y checkout. | `backend/tests/`, `frontend/src/**/*.test.*`, `frontend/e2e/casino.spec.ts` |
| Observabilidad/límites | Request ID y logs de duración/estado; body JSON limitado; rate limits por IP/proceso. Cliente web tiene timeout de 20s y reduced motion. | `backend/src/app.js`, `backend/src/middlewares/rateLimit.js`, `backend/README.md`, `frontend/src/shared/api/http.ts`, `frontend/src/app/providers.tsx`, `frontend/src/shared/hooks/useReducedMotion.ts` |

## Decisiones de documentación

- **Decisión**: La fuente de comportamiento es el código y DTOs locales, contrastados con pruebas. **Motivo**: planes y notas tienen fechas y pueden describir una fase anterior o un diseño futuro.
- **Decisión**: Un hecho externo no confirmado se registra como “no verificado”, sin convertirlo en una clarificación bloqueante. **Motivo**: el alcance es as-built local y no requiere comprobar el despliegue.
- **Decisión**: No se preparan cambios ni alternativas arquitectónicas. **Motivo**: la especificación solicita registrar lo existente, no planificar construcción.
- **Decisión**: Resultados de pruebas se presentan como evidencia histórica fechada y no como ejecución de este SDD. **Motivo**: no se ejecutó ninguna suite durante la tarea documental.

## Incertidumbres retenidas, no resueltas por investigación externa

- Salud actual y SHA publicado en Render/Firebase: no consultados.
- Aplicación de migraciones y estado actual de PostgreSQL remoto: no comprobados.
- Pago externo real: no afirmado; el código observado valida claves de test y el UI/E2E no comprueba un cobro real.
- Objetivos cuantificados de latencia, escala, disponibilidad, cumplimiento y retención: no encontrados en los artefactos revisados.
- Firebase Hosting: `frontend/firebase.json` existe como configuración; por sí sola no permite determinar el release servido actualmente.
- Fecha de ratificación de la constitución: el documento conserva `TODO(RATIFICATION_DATE)`.

No se compararon tecnologías ni se seleccionó una solución nueva.
