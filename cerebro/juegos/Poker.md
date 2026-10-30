---
tags: [juegos]
---
# ♠️ Póker

Texas Hold’em con estado y baraja persistidos en el servidor. Las cartas privadas de la banca permanecen ocultas hasta el cierre correspondiente.

API bajo `/api/games/poker`: configuración, inicio, partida activa, consulta por ID, acción y rondas. La interfaz se encuentra en `/juegos/poker`.

Fuentes: [rutas](../../backend/src/modules/games/poker/poker.routes.js), [lógica](../../backend/src/modules/games/poker/poker.logic.js), [pantalla](../../frontend/src/features/games/poker/pages/PokerPage.tsx).

Conecta [[cerebro/juegos/Juegos|Juegos]], [[cerebro/arquitectura/Datos|persistencia]], [[cerebro/seguridad/Seguridad y sesion|ownership y cartas ocultas]] y [[cerebro/economia/Billetera y ledger|saldo]].

## Arquitectura objetivo de la vertical

[[cerebro/backend/servicios/Poker|Servicio]] · [[cerebro/frontend/microfrontends/Poker|Microfrontend]] · [[cerebro/arquitectura/Consistencia distribuida|Liquidación distribuida]]
