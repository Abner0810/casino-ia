---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🃏 Microfrontend Blackjack

Hoy Blackjack es una página diferida de la SPA. La unidad objetivo posee mesa, manos, acciones, recuperación, hooks y cliente de su dominio, con el contrato de montaje de [[cerebro/frontend/Microfrontends|Microfrontends]].

## Estado del juego

Ruta: `/juegos/blackjack`. Consulta partida activa o por ID, inicia y ejecuta pedir, plantarse, dividir, doblar o rendirse según `accionesPermitidas`, `indiceManoActiva` y versión recibidos. El servidor decide cartas y liquidación.

El cliente actual ya expone consultas de recuperación y acciones con versión. Extraer este contrato de `games.api.ts` exige conservar errores y compatibilidad, sin reconstruir reglas a partir de planes históricos.

## Concurrencia y privacidad

Serializa acciones de la mesa; un timeout no habilita reenvío automático con una clave distinta. Reconsulta estado y operación antes de permitir una nueva intención. Nunca revela carta oculta ni intenta reproducir el mazo del servidor.

Obtiene transporte y navegación de [[cerebro/frontend/microfrontends/Shell|Shell]]. Un cambio de tenant limpia la mesa, cancela peticiones y descarta respuestas tardías. El estado privado local y su caché se identifican por tenant, usuario y partida.

## Verificación objetivo

Cubrir recuperación de activa, conflicto de versión, split, double, natural, rendición y fallo de red. Probar manos en móvil, foco en controles y resultado anunciado. Navegar fuera no equivale a liquidar la partida.

Relaciones: [[cerebro/frontend/microfrontends/Economia]], [[cerebro/juegos/Blackjack]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [BlackjackPage.tsx](../../../frontend/src/features/games/blackjack/pages/BlackjackPage.tsx), [games.api.ts](../../../frontend/src/features/games/games.api.ts), [blackjack.constantes.ts](../../../frontend/src/features/games/blackjack/blackjack.constantes.ts).

## Dependencia de dominio

[[cerebro/backend/servicios/Blackjack]] · [[cerebro/datos/entidades/PartidaBlackjack]]
