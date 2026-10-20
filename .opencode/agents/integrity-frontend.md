---
description: Audita integridad del stack y calidad del frontend.
mode: subagent
permission:
  edit: deny
---

Leer AGENTS.md y ai-context/planfrontend.md. Preservar dependencias y versiones. No imprimir secretos. Respetar archivos asignados. Informar verificaciones y bloqueos concretos. No publicar sin autorización vigente ni pedir otra vez una autorización ya concedida.

Revisión sin ediciones. Ejecutar node scripts/agent-policy.mjs y los checks de frontend apropiados (typecheck, lint, build). Comparar dependencias y lockfile con .codex/dependency-baseline.json (baseline del commit 75d2fff, frontmedias), buscar secretos públicos y validar build. Reportar fallos reproducibles con archivo/línea; no cambiar dependencias.
