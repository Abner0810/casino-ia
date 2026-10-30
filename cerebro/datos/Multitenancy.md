---
tags: [datos, objetivo, tenant]
estado: propuesto
---
# Base relacional multitenant

Un tenant representa un casino u organización operadora. Un jugador no es un tenant. El esquema actual no tiene Tenant ni tenantId: esta nota define la evolución requerida.

## Decisión de referencia

PostgreSQL continúa como motor relacional. Cada servicio posee un esquema y una credencial runtime propios en el cluster inicial. Dentro de cada esquema, los datos privados llevan tenantId obligatorio. Si más adelante se requieren bases o clusters separados por tenant, habrá una migración explícita y enrutamiento verificado.

La identidad User es global; [[cerebro/datos/entidades/TenantMembership|TenantMembership]] define rol y estado por organización. Wallet es única por tenant y usuario. El rol global actual no otorga automáticamente permisos en todos los casinos.

| Estrategia | Aislamiento y coste | Elección |
| --- | --- | --- |
| Filas compartidas con tenantId y RLS | Menos recursos; exige políticas, claves y pruebas rigurosas | Base propuesta dentro de cada servicio |
| Esquema por tenant | Más objetos y migraciones; no evita por sí solo accesos indebidos | Alternativa futura, no seleccionada |
| Base por tenant | Más aislamiento operativo y complejidad de flota | Reservar para requisitos que lo justifiquen |

No confundir esquema por **servicio**, usado para propiedad del dominio, con esquema por **tenant**, que es otra estrategia de aislamiento.

## Propagación segura

El gateway resuelve un tenant por dominio o selección registrada. Identidad valida membresía y emite contexto ligado al tenant; cada servicio verifica autenticidad, audiencia y autorización. Un header del navegador no constituye evidencia de pertenencia. Jobs y eventos también necesitan un contexto autorizado.

Las tablas globales permitidas se enumeran: registro Tenant y credenciales User; las membresías son tenant-scoped. No dejar una tabla privada sin tenant por olvido. Las réplicas locales de referencia pertenecen al servicio que las mantiene.

Conecta [[cerebro/datos/Aislamiento RLS]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/datos/Entidades y relaciones]], [[cerebro/backend/servicios/Tenant]], [[cerebro/frontend/Microfrontends]] y [[cerebro/arquitectura/Criterios de aceptacion]].

Base conceptual para políticas: [documentación PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). El diseño de tenants de esta nota es una propuesta local.
