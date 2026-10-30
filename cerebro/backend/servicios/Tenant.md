---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🏢 Servicio Tenant

**Actual:** no existe un módulo Tenant ni tenantId en el esquema actual. **Objetivo:** administrar los operadores/clientes de la plataforma como tenants aislados.

## Responsabilidad y propiedad

- Crear, activar, suspender y consultar tenants y su configuración permitida.
- Ser dueño del registro Tenant y del mapeo controlado dominio–tenant.
- Mantener un esquema relacional y credencial exclusivos; evitar escrituras de otros servicios.
- Publicar cambios versionados de configuración y estado con outbox duradero.

La identidad global y TenantMembership pertenecen a [[cerebro/backend/servicios/Identidad|Identidad]]. Tenant no modifica contraseñas, saldos, pagos ni partidas.

## Aislamiento y contratos objetivo

El tenant solicitado por dominio o cabecera es una selección; la autorización comprueba identidad, pertenencia y estado. No aceptar un tenantId del body como autorización suficiente.

Los demás servicios conservan una proyección local mínima de Tenant si necesitan FK internas. No existe una FK entre bases de servicios. Suspender un tenant exige política explícita para partidas, reservas y pagos pendientes: no borrar registros financieros.

El control administrativo requiere permisos de plataforma separados del rol de jugador. Las operaciones del plano de control también necesitan auditoría, idempotencia y pruebas de acceso cruzado.

## SOLID y pruebas de aceptación

SRP: ciclo de vida del operador. ISP: separar administración del tenant de consulta de configuración. DIP: repositorio y publicación como puertos. Verificar suspensión, dominio desconocido, acceso de otro tenant y propagación de cambios con retraso.

La ausencia actual se verifica en [schema.prisma](../../../backend/prisma/schema.prisma) y [app.js](../../../backend/src/app.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/arquitectura/Arquitectura objetivo]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Shell|Interfaz relacionada]] · [[cerebro/datos/entidades/Tenant]]
