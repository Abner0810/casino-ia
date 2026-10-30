---
tags: [datos, entidad]
---
# RefreshToken · Renovación de sesión

## Estado actual

Actual: userId, hash SHA-256 único, expiresAt, revokedAt, createdAt. Refresh opaco rotado en el backend; tokens del navegador solo en memoria.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo Identidad: vincular refresh con tenant seleccionado y membresía/contexto de autorización. Cambio de tenant exige contexto autorizado nuevo y revocación/rotación definida; no reutilizar silenciosamente una sesión de otro casino.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Identidad]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Probar rotación concurrente, revocación y rechazo de tenant cambiado. Tokens, hashes y ejemplos de credenciales no se copian a notas.

## Relaciones

[[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/TenantMembership]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
