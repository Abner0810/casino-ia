---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🎡 Microfrontend Ruleta

Hoy la ruta de ruleta pertenece a una SPA y se carga de forma diferida. La unidad objetivo encapsula el formulario de selecciones, la representación del giro, configuración, rondas y su cliente tipado.

## Contrato del dominio

La interfaz usa `/juegos/ruleta`; la API usa `games/roulette`. Mantener esta traducción en el servicio API del módulo. El contrato contempla pleno, color, paridad, docena y columna; el número y el retorno se reciben del servidor.

La configuración del backend determina límites y pagos. Los rótulos y animaciones no deben sustituir la validación ni el sorteo del servicio. Los colores del tablero necesitan también texto o símbolos distinguibles.

## Aislamiento y confirmación

El módulo usa `HttpPort` de [[cerebro/frontend/microfrontends/Shell|Shell]], claves de consulta por tenant/usuario y el contrato común de montaje. No comparte estado mutable de apuestas con otros juegos.

Una apuesta pendiente bloquea duplicados. Un resultado incierto requiere reconciliación por clave y lecturas; al confirmar se notifica a [[cerebro/frontend/microfrontends/Economia|Economía]] para invalidar. El evento no acredita el saldo.

## Verificación objetivo

Cubrir selección inválida, cero, apuestas perdidas/ganadas, configuración no disponible y cambio de tenant durante el giro. Probar teclado, reducción de movimiento y desmontaje sin timers o solicitudes pendientes.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/juegos/Ruleta]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [RoulettePage.tsx](../../../frontend/src/features/games/roulette/pages/RoulettePage.tsx), [games.api.ts](../../../frontend/src/features/games/games.api.ts).

## Dependencia de dominio

[[cerebro/backend/servicios/Ruleta]] · [[cerebro/datos/entidades/RondaRuleta]]
