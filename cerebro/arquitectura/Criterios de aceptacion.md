---
tags: [arquitectura, operacion]
estado: verificaciones propuestas
---
# Criterios de aceptación de arquitectura

Checklist futuro: no representa pruebas ejecutadas. Debe acompañar cada etapa de [[cerebro/arquitectura/Migracion incremental]].

## Datos y tenant

- Dos tenants con usuarios, claves de operación y recursos similares no comparten lecturas, escrituras, historiales ni resultados.
- Rechazar contexto ausente, falsificado, tenant inactivo y membresía suspendida; cubrir HTTP, jobs, eventos y webhook.
- Reutilizar una conexión para A, B y sin tenant y comprobar que el contexto RLS no se filtra. Probar SELECT, INSERT, UPDATE y DELETE con rol runtime.
- FK compuesta impide vincular registros de tenants distintos; unicidad de billetera y operación incluye tenant.
- Restauración de backups y exportaciones conserva aislamiento y conciliación del ledger.

## Servicios y dinero

- Dos peticiones simultáneas con la misma intención generan un único efecto; cambiar payload con la misma clave produce conflicto.
- Caída antes/después de reserva, sorteo, commit y publicación reanuda sin volver a sortear ni duplicar saldo.
- Eventos duplicados, fuera de orden y retrasados conservan transiciones válidas e inbox deduplicado.
- Pago confirmado y crédito económico tienen estados observables; webhook y sync concurrentes no duplican movimientos.
- Ningún servicio puede escribir tablas de otro usando sus credenciales.

## Microfrontends

- Un módulo puede desplegarse y volver a versión compatible sin rebuild de todos los demás.
- Fallar carga/montaje de un juego no rompe shell ni logout; unmount elimina listeners, timers y solicitudes.
- Login/refresh/logout y cambio de tenant no filtran tokens, caché ni respuestas anteriores entre módulos.
- Enlaces profundos, retorno checkout y navegación funcionan con teclado y movimiento reducido.

## Evidencia

Guardar commit, entorno, tenant de prueba, comandos, resultados y trazas sin secretos. Pruebas de contrato para [[cerebro/arquitectura/SOLID|SOLID]] y compatibilidad de DTOs/eventos; release conforme a [[cerebro/operacion/Calidad y despliegue]].

Fuentes para ampliar tests: backend/tests/, backend/tests/integration/, frontend/src/**/*.test.*, frontend/e2e/. La existencia de estos archivos no acredita cobertura de multitenancy actual.
