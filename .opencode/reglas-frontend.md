# Reglas del repo Casino IA (frontend)

Estas reglas son obligatorias para cualquier agente que trabaje en este repo.

## Fuente de verdad

- `ai-context/planfrontend.md`: especificación del frontend (stack, rutas, contratos, juegos, fases).
- `ai-context/pendientes-frontend.md`: checklist de lo exigido; se marca al completar.
- `backend/src/modules/**`: contratos reales de la API (DTOs y servicios). Antes de inventar un campo, léelo ahí.

## Stack congelado (no cambiar versiones ni dependencias)

Vite + React + TypeScript, React Router, TanStack Query, React Hook Form + Zod,
CSS Modules con tokens, Vitest + Testing Library + Playwright, Firebase Hosting.

- No agregar, quitar ni degradar dependencias sin autorización explícita.
- No editar lockfiles a mano. No usar `npx create-next-app` (el stack es Vite).
- Los archivos generados (`dist/`) nunca se editan.

## Contratos y seguridad

- El frontend NO decide resultados ni saldos: todo lo confirma el servidor.
- Los tokens viven SOLO en memoria (`authStore`); nunca en localStorage/sessionStorage/cookies.
- El refresh es coordinado (una sola renovación ante 401 concurrentes) y las
  mutaciones nunca se reintentan solas (timeout = resultado incierto → reconciliar).
- No subir ni imprimir secretos. Las variables `VITE_*` son públicas: cero secretos ahí.

## Calidad antes de dar algo por terminado

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

## Git y despliegue

- Flujo de ramas: `dev → qa → main`. `main` despliega a Firebase Hosting.
- `git push` requiere confirmación explícita del usuario.
- Desplegar: `npm run build` en `frontend/` y luego `firebase deploy --only hosting` (proyecto `casino-ia`).
  Publicar siempre el enlace `https://casino-ia.web.app` al terminar.
