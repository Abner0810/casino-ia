---
tags: [operacion]
---
# 🚀 Calidad y despliegue

Flujo del proyecto: `dev → qa → main`. La configuración apunta a Firebase Hosting para el frontend y Render para el backend. La existencia de archivos de configuración no acredita publicación ni salud remota.

Verificación de release desde la raíz:

```sh
node scripts/agent-policy.mjs --release
```

La política verifica dependencias, typecheck, lint, tests y build según el área. Ejecutar Playwright cuando cambian recorridos críticos. Usar `npm ci`; no cambiar versiones ni lockfiles.

Para una publicación, conservar evidencia del SHA, resultado del workflow, `/health` y recorrido publicado. Push y deploy requieren autorización vigente.

Fuentes: [[docs/agentes]], [[backend/DEPLOY]], [[frontend/README]], [[AGENTS]]. Conecta [[cerebro/gestion/Agentes y colaboracion|Agentes]], [[cerebro/gestion/Pendientes y decisiones|Pendientes]], [[cerebro/frontend/Frontend|Frontend]] y [[cerebro/backend/Backend|Backend]].

## Revisión del mapa · 29 de octubre de 2026

Ampliación documental de [[cerebro/arquitectura/Arquitectura objetivo|arquitectura]]: 80 notas, canvas de 44 elementos y 36 conexiones. Verificados 642 wikilinks y 133 enlaces locales a fuentes sin destinos rotos; JSON de grafo y canvas válidos. No se ejecutaron migraciones ni se modificó la arquitectura de la aplicación.

Se ejecutó `node scripts/agent-policy.mjs --release`: pasaron integridad de dependencias, typecheck, lint, tests y build frontend, además de check backend. La verificación completa falló en test:unit backend: 38/39 pruebas aprobadas; falla `tests/money.test.js:40`, validación de claves Stripe en producción (resultado 0 frente a 1 esperado). No se diagnosticó ni corrigió ese fallo durante esta tarea documental. No se ejecutó Playwright porque no se cambiaron recorridos de aplicación.

### Corrección posterior del aislamiento de pruebas

La prueba de configuración cargaba backend/.env mediante dotenv y completaba claves que el escenario pretendía dejar ausentes. Se fijó DOTENV_CONFIG_PATH a una fixture vacía en los procesos de validación de Stripe y CORS, sin cambiar la configuración del servidor ni las credenciales locales. Verificación posterior: `npm.cmd --prefix backend run test:unit`, 39/39 aprobadas; integridad de dependencias y git diff --check aprobados. No se repitió el release completo tras esta corrección.

Fuentes: [money.test.js](../../backend/tests/money.test.js), [fixture de entorno vacío](../../backend/tests/fixtures/empty-env.txt).

### Preparación del push a dev

Verificación completa posterior a la corrección: `node scripts/agent-policy.mjs --release` aprobada, incluidos los 39 tests unitarios backend. El recorrido Playwright de registro, login, checkout Stripe, retorno con reautenticación, Plinko, movimientos, retiro rechazado y logout aprobó en escritorio y móvil (2 escenarios). Usa API y checkout interceptados de QA; no demuestra un pago externo real.
