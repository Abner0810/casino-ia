---
tags: [arquitectura, patrones]
---
# Patrones de diseño

Selección para Casino IA. Actual = evidencia en el código local; objetivo = requiere implementación y pruebas. Un patrón se usa para resolver un problema concreto y debe justificar su coste.

| Patrón | Estado | Problema y aplicación |
| --- | --- | --- |
| Capas y Repository | Actual parcial | Aislar transporte, reglas y Prisma; [[cerebro/arquitectura/patrones/Capas y puertos]] |
| Ports and Adapters + DI | Objetivo; inyección parcial en pagos | Cambiar proveedor y persistencia sin cambiar reglas; [[cerebro/arquitectura/patrones/Capas y puertos]] |
| Unit of Work | Actual funcional | Saldo y ledger en transacción local; [[cerebro/arquitectura/patrones/Unidad de trabajo]] |
| Idempotent Receiver | Actual por usuario; extender tenant/servicio | Duplicados sin repetir efectos; [[cerebro/arquitectura/patrones/Idempotencia]] |
| Strategy | Objetivo | Variantes de reglas/configuración de juego; [[cerebro/arquitectura/patrones/Strategy y estado]] |
| Estado explícito | Actual; formalizar contratos | Evitar acciones de partida y pago inválidas; [[cerebro/arquitectura/patrones/Strategy y estado]] |
| Outbox + Inbox | Objetivo | Entrega durable y deduplicación; [[cerebro/arquitectura/patrones/Outbox e Inbox]] |
| Saga | Objetivo | Coordinar reserva, juego y liquidación; [[cerebro/arquitectura/patrones/Saga]] |
| Gateway / BFF | Objetivo | Enrutamiento y composición; [[cerebro/arquitectura/patrones/Gateway y CQRS]] |
| CQRS ligero | Objetivo | Lecturas de historial separadas de comandos; [[cerebro/arquitectura/patrones/Gateway y CQRS]] |
| Circuit Breaker + Bulkhead | Objetivo | Contener fallos remotos; [[cerebro/arquitectura/patrones/Resiliencia]] |
| Shell + Adapter + Pub/Sub | Objetivo; Provider/Observer actuales | Componer microfrontends sin compartir estado interno; [[cerebro/arquitectura/patrones/Composicion frontend]] |
| Strangler Fig | Objetivo | Extraer módulos por etapas; [[cerebro/arquitectura/patrones/Strangler]] |

**Database per Service** se aplica como propiedad exclusiva de datos: esquema y credencial por servicio al inicio, posibilidad de separar bases después. No exige abandonar el motor relacional ni crear una base por cada tabla. Véase [[cerebro/datos/Modelo relacional objetivo]].

No se selecciona Event Sourcing: el ledger actual no contiene todos los eventos para reconstruir la aplicación. Tampoco se adopta un Singleton como solución global de estado o un contenedor DI por obligación.

Referencias conceptuales: [catálogo de patrones para microservicios](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/patterns), [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs), [microfrontends](https://micro-frontends.org/). Los límites y protocolos concretos de estas notas son propuestas propias para el repositorio.

Conecta [[cerebro/arquitectura/SOLID]], [[cerebro/backend/Microservicios]], [[cerebro/frontend/Microfrontends]] y [[cerebro/arquitectura/Migracion incremental]].
