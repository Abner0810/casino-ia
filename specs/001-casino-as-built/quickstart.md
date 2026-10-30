# Guía de verificación local del estado actual

Esta guía describe cómo intentar verificar los recorridos que ya están implementados. **Los comandos son referencias documentales: no se ejecutaron al elaborar este plan.** El resultado local no confirma disponibilidad del despliegue.

## Requisitos locales observados

- Node.js compatible con los rangos declarados en `backend/package.json` y `frontend/package.json`.
- Dependencias instaladas desde sus lockfiles con `npm ci` en `backend/` y `frontend/`.
- Backend configurado con las variables requeridas por `backend/src/config/env.js`: conexión PostgreSQL (`DATABASE_URL`, `DIRECT_URL`), secretos JWT y CORS; Stripe test checkout requiere las variables test correspondientes.
- PostgreSQL local accesible y migraciones aplicadas antes de ejecutar recorridos que persisten usuario, saldo, partidas o pagos.
- Frontend configurado con `VITE_API_URL` apuntando al backend local. Esa variable viaja al navegador y no debe contener secretos.

No se incluyen valores de secretos ni URLs de entornos del equipo.

## Levantar la SPA y la API

En terminales separadas, desde la raíz:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
```

El script actual de frontend usa Vite; el de backend inicia `src/server.js` con Node watch. La API no inicia correctamente si faltan variables obligatorias o PostgreSQL no está accesible. El comando exacto para iniciar la DB depende del entorno local existente y no se prescribe aquí.

## Comprobar API y módulos

Con la API en marcha, el endpoint local `GET /health` ejecuta `SELECT 1`; un resultado sano incluye `status: ok` y `db: up`. Registro, auth, wallet, juegos y checkout requieren sesión o configuración según [contratos locales](contracts/api-local.md).

Para reproducir escenarios de usuario, usar una cuenta y datos locales controlados. El cliente mantiene sesión solo en memoria; una recarga de página requiere login de nuevo. Stripe se mantiene en modo test, no usar datos de tarjeta reales ni interpretar un retorno visual como acreditación confirmada.

## Verificaciones automatizadas existentes

Los siguientes scripts existen en package manifests y se documentan sin ejecutarlos:

```powershell
npm.cmd --prefix backend run check
npm.cmd --prefix backend run test:unit
npm.cmd --prefix backend run test:integration
npm.cmd --prefix backend run test:e2e
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run e2e
npm.cmd --prefix frontend run build
```

Las pruebas de integración backend requieren PostgreSQL conforme a su configuración. Playwright requiere el navegador y servidor que defina el setup local; `frontend/e2e/casino.spec.ts` intercepta API y checkout, por lo que no valida proveedor ni API remotos. El gate integral definido por el repositorio es `node scripts/agent-policy.mjs --release`.

Como antecedente, `backend/README.md` fecha al 19 de octubre de 2026 una ejecución local con Node 22 y PostgreSQL 18: 11 pruebas de lógica/contrato, 19 escenarios de integración, siete smoke checks y health 200. `ai-context/comparacion-frontend.md` documenta 33 Vitest y ocho pruebas Playwright con API interceptada. Estos resultados son registros históricos, no resultados de esta guía.

## Límite de verificación

No se ejecutaron estos comandos en la tarea SDD. No se verificaron migraciones de una base remota, webhook Stripe en un entorno externo, estado de Render, deploy Firebase ni SHA publicado. Los resultados históricos se encuentran en `ai-context/comparacion-frontend.md` y `cerebro/operacion/Calidad y despliegue.md`, con fecha y alcance propios.
