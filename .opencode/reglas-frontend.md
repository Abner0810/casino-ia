# Reglas Casino IA

Aplicar AGENTS.md, ai-context/planfrontend.md y los contratos reales del backend.
Las dependencias y versiones existentes permanecen congeladas. npm ci restaura el lockfile;
no usar install/update/add ni editar lockfiles a mano. Firebase solo aloja la SPA.

Usar los subagentes frontend-feature, api-contract, integrity-check, qa-review y deploy
con archivos asignados. Antes de publicar: `node scripts/agent-policy.mjs --release`.
La autorización vigente del usuario determina si se publica; no pedirla de nuevo si existe.
Nunca incluir secretos ni afirmar un deploy sin comprobar la URL y el run.
