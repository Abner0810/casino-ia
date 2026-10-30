---
tags: [arquitectura, patrones]
estado: Estado actual; Strategy objetivo
---
# Strategy y transiciones explícitas

## Evidencia

Los servicios de juegos y pagos tienen estados y reglas explícitas. accesoJuego ramifica por juego; no existe evidencia de un framework State o una familia formal de estrategias.

Fuente: [user.service.js](../../../backend/src/modules/users/user.service.js).

## Uso en la arquitectura objetivo

Definir GameRules para límites/configuración pública y un catálogo de estrategias registradas. Mantener motores distintos: no forzar Blackjack y Plinko a una interfaz de acciones falsa. Pago/partida definen transiciones condicionales y versión del agregado.

## Límites

No llamar Strategy a cualquier switch ni crear una clase por estado sin necesidad. Cada estrategia conserva permisos, moneda/unidad y semántica de límites.

## Verificación

Una variante nueva cumple suite de contrato; estado terminal rechaza nuevas acciones; versión antigua produce conflicto y permite reconsultar.

[[cerebro/arquitectura/solid/OCP]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
