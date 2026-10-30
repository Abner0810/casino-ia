---
tags: [datos, entidad]
---
# Tenant · Casino u organización

## Estado actual

No existe en schema.prisma actual. No confundir el usuario o la billetera con un tenant.

Fuente de contraste: [schema.prisma](../../../backend/prisma/schema.prisma). Para entidades nuevas, la fuente permite verificar su ausencia.

## Diseño objetivo

Propuesto: id, clave pública de organización, nombre, estado, configuración pública versionada y fechas. Tenant administra alta/suspensión; cada servicio mantiene referencias o proyecciones locales. No incluir secretos de proveedor en configuración pública.

Dueño o ejemplo de consumidor principal: [[cerebro/backend/servicios/Tenant]]. Cada servicio mantiene sus propias tablas técnicas.

## Invariantes y comprobación

Un tenant suspendido no acepta comandos nuevos; una liquidación previamente comprometida necesita política explícita de cierre y conciliación.

## Relaciones

[[cerebro/datos/entidades/TenantMembership]] · [[cerebro/datos/entidades/Wallet]]

[[cerebro/datos/Entidades y relaciones]] · [[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/datos/Multitenancy]]
