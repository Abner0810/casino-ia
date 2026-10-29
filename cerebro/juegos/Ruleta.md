---
tags: [juegos]
---
# 🎡 Ruleta

Ruleta europea con resultado de 0 a 36 generado por el servidor. El módulo contempla apuestas a número, color, paridad, docena o columna.

API: `GET /config`, `POST /bet`, `GET /rounds` bajo `/api/games/roulette`. La pantalla se visita en `/juegos/ruleta`.

Fuentes: [rutas](../../backend/src/modules/games/roulette/roulette.routes.js), [lógica](../../backend/src/modules/games/roulette/roulette.logic.js), [pantalla](../../frontend/src/features/games/roulette/pages/RoulettePage.tsx).

Conecta [[cerebro/juegos/Juegos|Juegos]], [[cerebro/economia/Billetera y ledger|liquidaciones]] y [[cerebro/arquitectura/Contratos y operaciones|contratos]].

## Arquitectura objetivo de la vertical

[[cerebro/backend/servicios/Ruleta|Servicio]] · [[cerebro/frontend/microfrontends/Ruleta|Microfrontend]] · [[cerebro/arquitectura/Consistencia distribuida|Liquidación distribuida]]
