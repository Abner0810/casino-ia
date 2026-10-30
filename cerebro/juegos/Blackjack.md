---
tags: [juegos]
---
# 🃏 Blackjack

El backend conserva la partida y decide cartas, manos y liquidación. El cliente ofrece acciones según el estado recibido y debe proteger la información oculta del crupier.

El módulo contiene inicio, pedir, plantarse, dividir, doblar, salida y consulta de rondas; revisar las rutas actuales para las consultas de recuperación de partidas. Los límites y reglas viven en la configuración del juego.

Fuentes: [rutas](../../backend/src/modules/games/blackjack/blackjack.routes.js), [servicio](../../backend/src/modules/games/blackjack/blackjack.service.js), [pantalla](../../frontend/src/features/games/blackjack/pages/BlackjackPage.tsx).

Conecta [[cerebro/juegos/Juegos|Juegos]], [[cerebro/economia/Billetera y ledger|saldo]], [[cerebro/arquitectura/Contratos y operaciones|recuperación de operaciones]] y [[cerebro/operacion/Calidad y despliegue|pruebas de regresión]].

## Recuperación y concurrencia

El código actual conserva versión de partida y restringe una partida activa por usuario con un índice parcial de migración. Los pendientes de planes antiguos sobre estos temas deben contrastarse con la implementación vigente y sus pruebas. La presencia de la migración no demuestra su aplicación remota.

## Arquitectura objetivo de la vertical

[[cerebro/backend/servicios/Blackjack|Servicio]] · [[cerebro/frontend/microfrontends/Blackjack|Microfrontend]] · [[cerebro/arquitectura/Consistencia distribuida|Liquidación distribuida]]
