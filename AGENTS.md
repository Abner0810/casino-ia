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
| api-contract | Comparar DTOs, rutas, auth, wallet y juegos con servicios frontend |
| integrity-check | Stack, dependencias, secretos públicos, typecheck y build |
| qa-review | Pruebas, regresiones, teclado, responsive y riesgos de concurrencia |
| deploy | Firebase Hosting, GitHub Actions, variables públicas y evidencia de publicación |

Cada agente devuelve archivos afectados, verificaciones y bloqueos verificables.
Los revisores no editan; frontend-feature y deploy trabajan en el alcance delegado.
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
