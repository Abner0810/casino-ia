---
tags: [juegos]
---
# 🎯 Plinko

Envía una apuesta con riesgo; el servidor genera la ruta y calcula multiplicador, retorno y saldo. La animación representa la respuesta recibida.

Operaciones: `POST /bet` y `GET /rounds` bajo `/api/games/plinko`. Consultar los límites en la configuración vigente, sin copiar cifras de planes antiguos.

Fuentes: [servicio](../../backend/src/modules/games/plinko/plinko.service.js), [configuración](../../backend/src/modules/games/plinko/plinko.config.js), [pantalla](../../frontend/src/features/games/plinko/pages/PlinkoPage.tsx).

Conecta [[cerebro/juegos/Juegos|Juegos]], [[cerebro/economia/Billetera y ledger|saldo]], [[cerebro/seguridad/Seguridad y sesion|seguridad]] y [[cerebro/frontend/Navegacion y experiencia|movimiento reducido]].

## Arquitectura objetivo de la vertical

[[cerebro/backend/servicios/Plinko|Servicio]] · [[cerebro/frontend/microfrontends/Plinko|Microfrontend]] · [[cerebro/arquitectura/Consistencia distribuida|Liquidación distribuida]]
