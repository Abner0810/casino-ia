---
tags: [datos, entidad]
---
# User · Identidad de usuario

## Estado actual

Actual: id interno, publicId único, email único global, passwordHash, nombre y rol global. La billetera y todas las partidas se relacionan hoy con este usuario.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Objetivo: identidad global propiedad de Identidad; roles operativos pasan a TenantMembership. No conceder permisos entre casinos por el rol actual. Mantener contratos públicos sin divulgar IDs o campos internos innecesarios.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Identidad]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Registro/login y asociación de membresía deben tener pruebas que no conviertan una cuenta global en acceso global.

## Relaciones

[[cerebro/datos/entidades/TenantMembership]] · [[cerebro/datos/entidades/RefreshToken]] · [[cerebro/datos/entidades/Wallet]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
