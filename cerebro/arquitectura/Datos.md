---
tags: [datos]
---
# Datos · entrada al modelo relacional

El esquema actual usa PostgreSQL y Prisma con relaciones entre usuarios, billeteras, movimientos, operaciones, pagos y cuatro juegos. Aún no contiene Tenant, pertenencias ni tenantId.

El mapa ampliado está en [[cerebro/datos/Entidades y relaciones]]. El diseño solicitado se desarrolla en [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/datos/Multitenancy]] y [[cerebro/datos/Aislamiento RLS]].

[[cerebro/arquitectura/Estado actual]] · [[cerebro/arquitectura/Arquitectura objetivo]] · [[cerebro/backend/Microservicios]]. Fuente: [schema.prisma](../../backend/prisma/schema.prisma).
