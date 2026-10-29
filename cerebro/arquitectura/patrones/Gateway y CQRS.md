---
tags: [arquitectura, patrones]
estado: Objetivo
---
# Gateway, BFF y CQRS ligero

## Evidencia

app.js expone módulos del monolito; wallet/balance e historial son lecturas del mismo esquema actual. No hay gateway remoto ni una proyección distribuida existente.

Fuente: [app.js](../../../backend/src/app.js).

## Uso en la arquitectura objetivo

Gateway valida contexto y enruta por dominio; puede componer catálogo/acceso e inicio sin convertirse en dueño de reglas monetarias. Economía conserva proyección de historial y balance; extracción de Reporting queda diferida.

## Límites

No hacer joins entre esquemas de otros servicios ni autorizar con una proyección atrasada. CQRS no implica Event Sourcing ni una tecnología de base diferente.

## Verificación

Contrato de ruta estable mientras se extrae servicio; historial eventual informa estado/actualización y nunca modifica dinero.

[[cerebro/backend/servicios/Gateway]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
