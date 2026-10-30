---
tags: [arquitectura, patrones]
estado: Actual por usuario; ampliar a tenant y servicio
---
# Idempotent Receiver

## Evidencia

executeOperation guarda fingerprint de intención y respuesta, con unicidad por usuario y clave. El frontend crea una UUID para cada intención y la conserva en errores.

Fuente: [operations.js](../../../backend/src/shared/operations.js).

## Uso en la arquitectura objetivo

Cada servicio deduplica por tenant, actor y clave; el evento económico tiene identidad estable independiente del número de entregas. Una consulta de recuperación se enruta al dueño y verifica tenant+usuario.

## Límites

Un reintento no debe generar una clave nueva. Una caché de respuestas sin retención planificada puede permitir duplicados tardíos. Nunca asumir que un timeout indica que no hubo commit.

## Verificación

Mismo payload/clave produce replay; payload distinto produce conflicto; concurrencia y reentrega de eventos generan un único efecto económico.

[[cerebro/datos/entidades/Operation]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
