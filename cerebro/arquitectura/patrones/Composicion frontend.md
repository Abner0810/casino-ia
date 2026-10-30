---
tags: [arquitectura, patrones]
estado: Provider/Observer actuales; composición objetivo
---
# Shell, Adapter y eventos

## Evidencia

La SPA tiene providers y observadores de sesión. Lazy importa juegos dentro de un solo build, sin releases autónomos.

Fuente: [providers.tsx](../../../frontend/src/app/providers.tsx).

## Uso en la arquitectura objetivo

Cada microfrontend publica ESM versionado con mount(element,ports) y unmount; un manifiesto controlado enlaza artefactos permitidos. Shell entrega HttpPort, SessionPort y NavigationPort según consumidor; eventos validados notifican invalidaciones con tenant y versión.

## Límites

No compartir tokens en eventos, un store mutable global, imports privados ni BrowserRouter anidados. Un bundle remoto ejecuta código confiable de la aplicación: este diseño no lo aísla de código malicioso. Si se necesita esa frontera, evaluar iframe y transporte apropiados.

## Verificación

Fallo de módulo muestra fallback; unmount limpia listeners/timers/peticiones; sesión cambia una sola vez y las respuestas del tenant anterior se descartan.

[[cerebro/frontend/Microfrontends]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
