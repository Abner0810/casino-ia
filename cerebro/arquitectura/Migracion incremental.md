---
tags: [arquitectura, gestion]
estado: plan propuesto
---
# Migración incremental

Cambiar arquitectura por etapas protege el ledger. Esta tarea documenta el plan; no ejecuta migraciones ni altera dependencias.

| Etapa | Trabajo | Criterio de salida |
| --- | --- | --- |
| 0 | Inventariar rutas, DTOs, garantías y pruebas actuales | [[cerebro/arquitectura/Estado actual|Línea base]] reproducible |
| 1 | Definir Tenant y membresías; crear tenant inicial y backfill | Todos los registros asignados y auditoría de conteos/saldos |
| 2 | Tenant obligatorio, índices/FK compuestos y políticas RLS | [[cerebro/arquitectura/Criterios de aceptacion|Pruebas de aislamiento]] en pool real |
| 3 | Encapsular casos de uso y puertos SOLID dentro del monolito | Sin acceso cruzado de módulos a Prisma ajeno |
| 4 | Delimitar Economía y protocolo de reservas, outbox/inbox | Caídas y duplicados sin pérdida de dinero |
| 5 | Extraer un juego detrás del gateway | Contratos y reconciliación equivalentes |
| 6 | Extraer juegos restantes y Pagos; Tenant/Identidad según límites | Datos propios, credenciales y releases independientes |
| 7 | Introducir shell y extraer un microfrontend por ruta | Montaje versionado, deep links, sesión y caché aislada |
| 8 | Validar operación y retirada de rutas antiguas | Evidencia de tenant, saga, observabilidad y rollback |

Antes de NOT NULL y RLS, validar backfill y restricciones. Antes de extraer un servicio, separar sus tablas y diseñar referencias sin FK remotas. Evitar escritura doble sin protocolo de reconciliación.

Rollback: volver tráfico a una versión compatible manteniendo un único escritor por recurso. Una compensación de negocio agrega movimientos; no borra el ledger. Una migración destructiva de datos no se revierte simplemente redirigiendo HTTP.

No se selecciona broker, orquestador ni plugin de federación en esta documentación. Cualquier implementación debe respetar las dependencias fijadas por [[AGENTS]].

Conecta [[cerebro/arquitectura/patrones/Strangler]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]], [[cerebro/frontend/Microfrontends]] y [[cerebro/gestion/Pendientes y decisiones]].
