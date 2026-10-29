---
tags: [datos, entidad]
---
# TenantMembership · Pertenencia y rol por tenant

## Estado actual

No existe en el esquema actual; User.rol no ofrece aislamiento entre organizaciones.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Propuesto en Identidad: tenantId, userId, rol, estado y fechas; UNIQUE(tenantId,userId). User y TenantReference local permiten integridad dentro de Identidad, sin FK al esquema del servicio Tenant.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Identidad]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Membresía inactiva o tenant distinto rechaza autorización; definir revocación de contexto ya emitido mediante versión y vigencia acotada.

## Relaciones

[[cerebro/datos/entidades/Tenant]] · [[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/RefreshToken]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
