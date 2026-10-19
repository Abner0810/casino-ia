# Agentes y hooks

Los cinco roles existen en `.codex/agents/*.toml` y `.opencode/agents/*.md`.
No fijan modelos: heredan la selección de la sesión y no agregan dependencias.

| Rol | Uso y entrega |
| --- | --- |
| frontend-feature | Implementar una funcionalidad con hooks de React, estados accesibles y pruebas pertinentes |
| api-contract | Revisar DTOs y rutas de cada módulo; devolver incompatibilidades sin editar |
| integrity-check | Validar stack, lockfile, ausencia de secretos y compilación sin editar |
| qa-review | Verificar regresiones, teclado, responsive, autenticación y juegos sin editar |
| deploy | Preparar Firebase/Actions y comprobar publicación usando la autorización vigente |

En Codex: «Usa frontend-feature para implementar X y api-contract para revisar sus DTOs;
asigna archivos sin solapamiento y espera ambos resultados». Las definiciones se descubren
automáticamente al abrir una nueva sesión en este repositorio. En OpenCode se puede
invocar `@frontend-feature`, `@deploy`, `@integrity-check`, `@qa-review` o `@api-contract`.

Los hooks de Codex viven en `.codex/hooks.json`; SessionStart verifica el stack y añade
contexto. PreToolUse bloquea instalaciones/actualizaciones de paquetes, manifests,
lockfiles y archivos `.env` reales. Antes de git push o firebase deploy ejecuta
typecheck, lint, tests y build. El plugin `.opencode/plugins/casino-guardia.js` aplica
la misma política mediante `tool.execute.before`, sin SDK ni instalación adicional.

La integridad compara dependencias/engines con `.codex/dependency-baseline.json` y
SHA-256 del lockfile normalizado a LF para funcionar igual en Windows y Linux.
La referencia corresponde al commit `75d2fff` de `frontmedias`; `dev` todavía no tenía frontend.
No regenerarla para ocultar cambios de dependencias.

Desde la raíz del repositorio:

```sh
node scripts/agent-policy.mjs
node --test scripts/agent-policy.test.mjs
node scripts/agent-policy.mjs --release
```

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
