# Casino IA: instrucciones para agentes

## Fuente de verdad y stack

Leer ai-context/planfrontend.md, ai-context/pendientes-frontend.md y los DTOs/controladores
de backend/src/modules/ antes de modificar contratos. Mantener React + TypeScript + Vite,
React Router, TanStack Query, React Hook Form + Zod, CSS Modules, Vitest y Playwright.
No agregar, quitar ni cambiar versiones de dependencias. Usar npm ci, no editar lockfiles.

## Delegación

Para tareas que involucren varias áreas, delegar subagentes con archivos asignados sin solapamiento:

| Agente | Responsabilidad |
| --- | --- |
| frontend-feature | Pantallas, componentes, hooks de React y estados accesibles |
| backend-feature | Endpoints, servicios, middlewares y tests del backend |
| api-contract | Comparar DTOs, rutas, auth, wallet y juegos con servicios frontend |
| integrity-frontend | Lockfile, secretos públicos, typecheck y build del frontend |
| integrity-backend | Lockfile, secretos, check y tests unitarios del backend |
| qa-frontend | Pruebas, regresiones, teclado y responsive del frontend |
| qa-backend | Regresiones de API, anti-IDOR, idempotencia y ledger |
| deploy-frontend | Firebase Hosting, Actions del frontend, variables públicas y evidencia |
| deploy-backend | Workflows del backend, render.yaml y confirmación de /health |

Cada agente devuelve archivos afectados, verificaciones y bloqueos verificables.
Los revisores no editan; los roles feature y deploy trabajan en el alcance delegado.
Los agentes heredan modelo y permisos. Detalles: docs/agentes.md.

## Producto y seguridad

- El servidor decide resultados y saldo. Presentar operaciones de simulación.
- Tokens solo en memoria; refresh coordinado, sin reintentos automáticos de mutaciones.
- Aislar caché por usuario, cancelar solicitudes al salir y descartar respuestas tardías.
- Formularios con etiquetas, teclado, movimiento reducido y estados de carga/error/vacío.
- Variables VITE_* son públicas. No incluir tokens privados ni credenciales de Firebase.

## Verificación y publicación

Desde la raíz: `node scripts/agent-policy.mjs --release` verifica dependencias,
typecheck, lint, tests y build. Ejecutar Playwright al cambiar recorridos críticos.
Flujo: dev → qa → main; main publica mediante GitHub Actions a casino-ia-4e7b6.
Continuar con la autorización vigente; no hacer push/deploy sin autorización.
No afirmar que https://casino-ia-4e7b6.web.app está publicado solo porque hay configuración.
