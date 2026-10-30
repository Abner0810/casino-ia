---
tags: [frontend]
---
# 🩵 Frontend

React, TypeScript y Vite; React Router para navegación, TanStack Query para datos remotos, React Hook Form y Zod para formularios, CSS Modules para estilos.

- [[cerebro/frontend/Navegacion y experiencia|Navegación y experiencia]] conecta las pantallas.
- [[cerebro/seguridad/Seguridad y sesion|Sesión]] controla acceso y limpieza de datos privados.
- [[cerebro/arquitectura/Contratos y operaciones|HTTP y operaciones]] conectan con el servidor.
- [[cerebro/economia/Billetera y ledger|Billetera]], [[cerebro/economia/Pagos Stripe|pagos]] y [[cerebro/juegos/Juegos|juegos]] son los principales flujos privados.

Fuentes: [App.tsx](../../frontend/src/app/App.tsx), [http.ts](../../frontend/src/shared/api/http.ts), [[frontend/README]], [[ai-context/planfrontend]].

La verificación y publicación se describen en [[cerebro/operacion/Calidad y despliegue|Calidad y despliegue]].

## Evolución arquitectónica

[[cerebro/frontend/Microfrontends|Mapa de microfrontends objetivo]] · [[cerebro/arquitectura/Estado actual|SPA actual]] · [[cerebro/datos/Multitenancy|Aislamiento tenant]]
