---
tags: [juegos]
---
# 🎮 Juegos

Hay cuatro módulos con implementación en frontend y backend:

| Juego | Experiencia | API base |
| --- | --- | --- |
| [[cerebro/juegos/Plinko|Plinko]] | Apuesta y trayectoria | `/api/games/plinko` |
| [[cerebro/juegos/Blackjack|Blackjack]] | Mesa y decisiones por mano | `/api/games/blackjack` |
| [[cerebro/juegos/Ruleta|Ruleta]] | Apuestas y giro europeo | `/api/games/roulette` |
| [[cerebro/juegos/Poker|Póker]] | Texas Hold’em | `/api/games/poker` |

El servidor determina resultados y liquidaciones. La interfaz muestra esos resultados y actualiza [[cerebro/economia/Billetera y ledger|Billetera y ledger]]. La existencia de una pantalla no demuestra pruebas end-to-end completadas.

Dependencias comunes: [[cerebro/seguridad/Seguridad y sesion|sesión]], [[cerebro/arquitectura/Contratos y operaciones|contratos e idempotencia]], [[cerebro/operacion/Calidad y despliegue|QA]]. Fuentes: `backend/src/modules/games/` y `frontend/src/features/games/`.
