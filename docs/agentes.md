# Agentes y hooks

Los nueve roles existen en `.codex/agents/*.toml` y `.opencode/agents/*.md`.
No fijan modelos: heredan la selección de la sesión y no agregan dependencias.

| Rol | Uso y entrega |
| --- | --- |
| frontend-feature | Implementar una funcionalidad con hooks de React, estados accesibles y pruebas pertinentes |
| backend-feature | Implementar endpoints, servicios y tests en backend/src con la arquitectura por capas existente |
| api-contract | Revisar DTOs y rutas de cada módulo; devolver incompatibilidades sin editar |
| integrity-frontend | Validar lockfile del frontend, ausencia de secretos y compilación sin editar |
| integrity-backend | Validar lockfile del backend, checks y tests unitarios sin editar |
| qa-frontend | Verificar regresiones, teclado, responsive, autenticación y juegos sin editar |
| qa-backend | Verificar regresiones de API, anti-IDOR, idempotencia y ledger sin editar |
| deploy-frontend | Preparar Firebase/Actions del frontend y comprobar publicación usando la autorización vigente |
| deploy-backend | Preparar workflows y render.yaml del backend y confirmar /health con el SHA desplegado |

En Codex: «Usa backend-feature para implementar X y api-contract para revisar sus DTOs;
asigna archivos sin solapamiento y espera ambos resultados». Las definiciones se descubren
automáticamente al abrir una nueva sesión en este repositorio. En OpenCode se pueden
invocar con `@` seguido del nombre del rol.

## Hooks

Cuatro reglas, aplicadas en tres capas con la misma política (`scripts/agent-policy.mjs`):

| # | Regla | Git hooks | Agentes (Codex y OpenCode) |
| --- | --- | --- | --- |
| 1 | No pushear a main: el git flow exige PR (dev → qa → main) | `pre-push` lee los refs de stdin y aborta si el destino es `refs/heads/main` | `evaluateOperation` deniega `git push` con destino main (`origin main`, `HEAD:main`, `dev:main`) |
| 2 | Archivos sensibles o pesados, con o sin gitignore | `pre-commit` revisa paths en el índice y tamaños > 1 MB | Se deniega escritura sobre `.env` reales, `node_modules`, `dist`, `build`, `coverage`, llaves, credenciales y binarios |
| 3A | Secretos por contenido: patrones concretos (clave privada, tokens AWS/GitHub, JWT firmado y valores reales de las variables sensibles del proyecto) | `pre-commit` escanea el diff en el índice | Se escanea el texto de comandos y ediciones |
| 3C | Convención de commits: `tipo(scope): mensaje` | `commit-msg` valida el primer renglón del archivo que Git entrega como argumento | Se valida `git commit -m` |
| QA | Integridad y verificaciones antes de publicar | `pre-push` ejecuta `node scripts/agent-policy.mjs --release` desde raíz | La misma verificación antes de `git push` o `firebase deploy`, también con ejecutables `.cmd` de Windows |

Excepciones de la regla 3A: archivos `.example`, `*.test.*`/`*.spec.*`, directorios
`tests/`, marcadores de ejemplo (`<...>`, `${...}`, `...`, `TU-`, `cambia-`, `REEMPLAZAR`,
`ci-access-secret`, `casino_test:casino_test@localhost`, entre otros) y asignaciones de
variables en código. Los mensajes generados por git (`Merge`, `Revert`, `fixup!`)
se permiten sin convención. `--amend` no se comprueba anticipadamente por el agente, pero el hook `commit-msg`
sí valida el mensaje final. Git permite omitir sus hooks con `--no-verify`.
No se valida `password:` genérico
para no bloquear validadores legítimos de auth.

`pre-commit` solo revisa archivos staged y sintaxis backend; no lee COMMIT_EDITMSG,
que puede no existir o contener un mensaje anterior en esa fase. `commit-msg`
valida el mensaje actual, también en el primer commit y con `git commit -F`.
El reconocimiento de comandos admite nombres Windows (`npm.cmd`, `firebase.cmd`,
`git.exe`) y rutas entre comillas. `npm.cmd ci` sigue permitido; instalar o cambiar
dependencias sigue bloqueado.

Los hooks de Codex viven en `.codex/hooks.json`; SessionStart verifica ambas baselines y
añade contexto. PreToolUse aplica estas reglas antes de cada herramienta. El plugin
`.opencode/plugins/casino-guardia.js` aplica la misma política mediante
`tool.execute.before`, sin SDK ni instalación adicional.

## Baselines de dependencias

La integridad compara dependencias/engines y SHA-256 del lockfile normalizado a LF
para funcionar igual en Windows y Linux, con dos archivos:

- `.codex/dependency-baseline.json` — frontend, referencia del commit `75d2fff` de `frontmedias`.
- `.codex/dependency-baseline-backend.json` — backend, estado auditado al crearla.

No regenerarlas para ocultar cambios de dependencias. Desde la raíz del repositorio:

```sh
node scripts/agent-policy.mjs
node --test scripts/agent-policy.test.mjs
node --test scripts/githooks.test.mjs
node scripts/agent-policy.mjs --release
```

`--release` verifica ambas baselines, typecheck/lint/test/build de frontend y
check/test:unit de backend. `pre-push` utiliza esa función sin repetir por separado
las tareas backend. Un fallo de cualquier paso bloquea el push y conserva el remoto.
No publica por sí mismo ni ejecuta pruebas contra bases de producción.

Los git hooks se instalan desde raíz con `npm.cmd --prefix backend run hooks:install`
en Windows (en otros sistemas, `npm --prefix backend run hooks:install`).
Confirmar con `git config --local --get core.hooksPath`: debe devolver `.githooks`.
En Windows los ejecuta Git for Windows. La instalación es local por checkout;
tener los archivos versionados no activa por sí mismo esta configuración.

Las pruebas de `githooks.test.mjs` usan repositorios temporales y un remoto bare
local: comprueban commits reales y que pre-push detenga una publicación cuando
falla frontend, sin contactar GitHub ni modificar el repositorio de trabajo.

Los hooks no son una frontera de seguridad: scripts arbitrarios pueden escribir archivos,
otros comandos pueden publicar y una sesión sin hooks activos no ejecuta esta política.
Las pruebas verifican los handlers reales mediante Node; OpenCode debe estar instalado
para comprobar también su carga dentro del cliente. Los comandos de hooks Codex se
resuelven desde la raíz: iniciar la sesión allí.

Codex exige confiar en el proyecto y revisar las definiciones de hooks mediante `/hooks`
antes de ejecutarlas; cuando cambian deben revisarse de nuevo. Esta es una restricción
del cliente, no una confirmación adicional de git push/deploy. Los permisos y credenciales
del usuario siguen aplicándose; los agentes no reciben acceso externo por tener un rol.

Referencias oficiales consultadas:

- [Subagentes Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Hooks Codex](https://learn.chatgpt.com/docs/hooks)
- [Agentes OpenCode](https://opencode.ai/docs/agents/)
- [Plugins OpenCode](https://opencode.ai/docs/plugins/)
- [Permisos OpenCode](https://opencode.ai/docs/permissions/)

## Mapa de conocimiento

[[cerebro/Inicio|Casino IA · Segundo cerebro]] · [[cerebro/Guia del grafo|Guía del grafo de Obsidian]]
