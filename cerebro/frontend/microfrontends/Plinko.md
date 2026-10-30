---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🎯 Microfrontend Plinko

Hoy Plinko es una página cargada de forma diferida dentro de la SPA. El objetivo es una entrada ESM con build propio que sea dueña del tablero, formulario, hooks, cliente y DTOs de su juego.

## Flujo y límites

Ruta: `/juegos/plinko`. Consulta acceso y configuración, recoge apuesta/riesgo, envía una operación y representa la ruta recibida del servidor. La animación no decide el resultado ni el multiplicador.

El cliente de Plinko debe separarse gradualmente de `games.api.ts`, que hoy concentra los cuatro juegos. El transporte procede de [[cerebro/frontend/microfrontends/Shell|Shell]]; no se importa el store de auth ni la caché de [[cerebro/frontend/microfrontends/Economia|Economía]].

## Operaciones y experiencia

Bloquea envíos duplicados y nuevas apuestas mientras la operación está pendiente. Ante respuesta incierta conserva su clave, consulta y reconcilia sin crear otra apuesta. Tras confirmación, notifica invalidación de dinero; el backend conserva la autoridad.

La caché local incluye tenant y usuario para configuración privada, acceso y rondas. Al desmontar o cambiar contexto cancela peticiones, animaciones y suscripciones. En movimiento reducido muestra el resultado sin exigir animación.

## Verificación objetivo

Probar riesgos válidos, límites, saldo insuficiente, resultado neto frente a retorno bruto, fallo de red y cambio de tenant durante una animación. El tablero debe conservar etiquetas y legibilidad en móvil.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/juegos/Plinko]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [PlinkoPage.tsx](../../../frontend/src/features/games/plinko/pages/PlinkoPage.tsx), [Tablero.tsx](../../../frontend/src/features/games/plinko/components/Tablero.tsx), [games.api.ts](../../../frontend/src/features/games/games.api.ts).

## Dependencia de dominio

[[cerebro/backend/servicios/Plinko]] · [[cerebro/datos/entidades/RondaPlinko]]
