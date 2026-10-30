---
tags: [arquitectura, solid]
estado: principio objetivo
---
# OCP · Abierto a extensión

Agregar una variante implementando un contrato, conservando estable el flujo compartido.

## Evidencia actual

user.service importa configuraciones y ramifica por juego. Añadir juegos requiere tocar ese flujo.

Fuente: [user.service.js](../../../backend/src/modules/users/user.service.js).

## Aplicación objetivo

Un registro de capacidades GameRules y catálogo versionado reemplaza condiciones repartidas. El shell resuelve microfrontends mediante manifiesto controlado.

## Cómo comprobarlo

Registrar un juego de prueba no cambia código de sesión, ledger ni navegación general. No convertir todo en plugins si no existe variación real.

Volver a [[cerebro/arquitectura/SOLID]]. Aplicar en [[cerebro/backend/Microservicios]] y [[cerebro/frontend/Microfrontends]]. Relacionar con [[cerebro/arquitectura/Patrones de diseno]].
