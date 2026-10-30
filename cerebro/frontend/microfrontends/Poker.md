---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# ♠️ Microfrontend Póker

Hoy Póker se carga de forma diferida dentro de la SPA. La unidad objetivo conserva interfaz, hooks y cliente de Texas Hold’em contra banca, con despliegue y ciclo de montaje propios.

## Contrato de mesa

Ruta: `/juegos/poker`. El cliente consulta configuración y partida activa, inicia y envía `check`, `raise` o `fold` con versión de partida. Representa preflop, flop, turn, river y showdown según el estado recibido.

Las cartas privadas y comunitarias se muestran a partir de la respuesta. Las cartas ocultas de la banca y el mazo nunca se deducen ni se almacenan desde datos no autorizados. El servicio decide ganador, bote y liquidación.

## Recuperación y tenant

La consulta por ID y activa permite reconstruir la mesa confirmada. Ante conflicto o timeout no se avanza una fase localmente ni se repite automáticamente una intención. Se consulta la operación y el estado antes de habilitar otra acción.

[[cerebro/frontend/microfrontends/Shell|Shell]] proporciona transporte cancelable y contexto. La caché se particiona por tenant, usuario y partida; desmontaje, logout o cambio de tenant eliminan mesa, suscripciones y respuestas tardías. [[cerebro/frontend/microfrontends/Economia|Economía]] recibe solo avisos de invalidación.

## Verificación objetivo

Cubrir acciones permitidas, versión obsoleta, recuperación, retiro, cierre y banca oculta. Probar distribución de cartas en móvil, navegación por teclado y fallo aislado del módulo.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/juegos/Poker]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [PokerPage.tsx](../../../frontend/src/features/games/poker/pages/PokerPage.tsx), [CartaPoker.tsx](../../../frontend/src/features/games/poker/components/CartaPoker.tsx), [games.api.ts](../../../frontend/src/features/games/games.api.ts).

## Dependencia de dominio

[[cerebro/backend/servicios/Poker]] · [[cerebro/datos/entidades/PartidaPoker]]
