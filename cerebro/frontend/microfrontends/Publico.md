---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 🌟 Microfrontend público

Hoy la landing se importa en la SPA desde `features/landing`. La unidad objetivo posee la presentación del simulador y los accesos a registro y login; su extracción puede servir como primer piloto por su menor dependencia de estado privado.

## Límite del módulo

Ruta de referencia: `/`. Recibe navegación y configuración pública de marca del tenant desde [[cerebro/frontend/microfrontends/Shell|Shell]]. No recibe tokens, historial, cartas ni billeteras. El contexto de marca no concede acceso a datos privados.

Publica una entrada ESM con el contrato de [[cerebro/frontend/Microfrontends|Microfrontends]] y administra su propio montaje, eventos DOM y limpieza. No importa el store de autenticación para decidir permisos: puede consultar una capacidad pública del shell para orientar sus enlaces.

## Experiencia y verificación

Mantener contenido útil durante la carga, enlaces con nombre accesible, foco visible, presentación responsive y movimiento reducido. Las imágenes o animaciones no deben impedir llegar a los formularios.

Probar una marca inexistente con fallback, enlaces a [[cerebro/frontend/microfrontends/Identidad y perfil|Identidad y perfil]], recarga directa de `/` y fallo de carga sin bloquear el shell. El módulo no introduce datos privados en variables públicas.

## Dependencias de arquitectura

La configuración por tenant procede del contexto de [[cerebro/datos/Multitenancy|Multitenancy]]. Se aplica responsabilidad única para presentación e inversión de dependencias mediante `NavigationPort`; ver [[cerebro/arquitectura/SOLID]] y [[cerebro/arquitectura/Patrones de diseno]].

Relaciones: [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]], [[cerebro/frontend/microfrontends/Inicio y lobby]].

Fuentes actuales: [LandingPage.tsx](../../../frontend/src/features/landing/pages/LandingPage.tsx), [App.tsx](../../../frontend/src/app/App.tsx).
