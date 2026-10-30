---
tags: [arquitectura, patrones]
estado: Objetivo distribuido
---
# Timeout, Circuit Breaker y Bulkhead

## Evidencia

El transporte frontend ya normaliza errores y cancela peticiones; no existe evidencia de circuit breakers entre servicios separados.

Fuente: [http.ts](../../../frontend/src/shared/api/http.ts).

## Uso en la arquitectura objetivo

Definir timeout por dependencia, límites de concurrencia por servicio y cuotas por tenant. Abrir circuito ante fallos repetidos; consultas pueden reintentarse con backoff acotado. Comandos remotos solo se recuperan con identidad idempotente y estado persistido.

## Límites

El navegador no reintenta automáticamente apuestas. Una desconexión no dispara compensación ciega. Evitar que un tenant agote conexiones o que la caída de Poker bloquee logout.

## Verificación

Demostrar degradación parcial, presupuesto de latencia y recuperación; medir intención pendiente y edad de outbox sin loguear credenciales.

[[cerebro/arquitectura/Criterios de aceptacion]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
