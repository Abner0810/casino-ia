---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🏠 Microfrontend de inicio y lobby

Hoy `features/home` y `features/games/lobby` son áreas de la SPA. Se propone una unidad de descubrimiento y resumen para `/inicio` y `/juegos`, manteniendo cada mesa como microfrontend independiente.

## Responsabilidades

Muestra accesos, resumen confirmado y catálogo permitido para el tenant. Usa el transporte y navegación de [[cerebro/frontend/microfrontends/Shell|Shell]]. No importa páginas de juegos, no genera resultados y no autoriza apuestas; los servicios vuelven a comprobar permisos y límites.

Navega a [[cerebro/frontend/microfrontends/Plinko|Plinko]], [[cerebro/frontend/microfrontends/Blackjack|Blackjack]], [[cerebro/frontend/microfrontends/Ruleta|Ruleta]] y [[cerebro/frontend/microfrontends/Poker|Póker]]. Cada juego es una ruta registrada por la composición, con un fallback si su artefacto no carga.

## Consistencia y tenant

Si muestra saldo, lo consulta como lectura de economía y lo invalida con un aviso de dinero confirmado. Un evento no modifica el saldo local como si fuera un crédito. La caché incluye tenant, usuario y recurso; una configuración de catálogo no debe filtrarse entre tenants.

No mantener un store universal con estado de mesas. Una partida activa y su recuperación son responsabilidad de su módulo y del backend.

## Verificación objetivo

Probar catálogo vacío, servicio no disponible, juego deshabilitado por tenant, navegación por teclado y fallo aislado de un microfrontend. Revisar que ocultar una tarjeta no sea el único control de permisos.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/frontend/microfrontends/Economia]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [InicioPage.tsx](../../../frontend/src/features/home/pages/InicioPage.tsx), [JuegosPage.tsx](../../../frontend/src/features/games/lobby/pages/JuegosPage.tsx), [games.api.ts](../../../frontend/src/features/games/games.api.ts).
