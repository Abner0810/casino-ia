---
tags: [arquitectura, patrones]
estado: Objetivo, no implementado
---
# Outbox e Inbox

## Evidencia

Hay persistencia de Operation y transacciones locales, pero no tablas ni relay durable para eventos interservicio.

Fuente: [schema.prisma](../../../backend/prisma/schema.prisma).

## Uso en la arquitectura objetivo

Guardar evento y cambio de negocio en el mismo commit local. Un relay entrega con reintentos; el consumidor registra inbox y efecto en su commit. Sobre propuesto: eventId, tipo, schemaVersion, tenantId, actor, aggregateId, aggregateVersion, correlationId y payload mínimo. Validar emisor, esquema y alcance.

## Límites

No marcar un mensaje procesado antes del efecto. No publicar solo en memoria tras el commit ni prometer exactly-once de la red. No transportar tokens, mazos o datos privados innecesarios.

## Verificación

Caída del relay tras enviar produce duplicado tolerado; evento fuera de orden no revierte estados; cola de fallos conserva alerta y ruta de conciliación.

[[cerebro/datos/entidades/Outbox e Inbox]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
