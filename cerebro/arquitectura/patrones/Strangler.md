---
tags: [arquitectura, patrones]
estado: Plan de migración
---
# Strangler Fig

## Evidencia

La aplicación actual sirve como línea base funcional. No hay evidencia de enrutamiento parcial a servicios nuevos.

Fuente: [app.js](../../../backend/src/app.js).

## Uso en la arquitectura objetivo

Conservar rutas públicas y mover un dominio por vez detrás de Gateway. Extraer un microfrontend por ruta con manifiesto versionado y fallback compatible. Registrar al dueño único de escrituras de cada recurso durante la transición.

## Límites

Evitar una reescritura completa y evitar que monolito y servicio nuevo escriban simultáneamente el mismo saldo. Volver tráfico atrás requiere datos/contratos compatibles.

## Verificación

Comparar contratos y ledger antes/después; una versión independiente puede volver a la anterior sin invalidar intenciones ya confirmadas.

[[cerebro/arquitectura/Migracion incremental]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
