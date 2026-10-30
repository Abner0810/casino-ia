---
tags: [mapa]
actualizado: 2026-10-29
---
# Casino IA · Arquitectura y segundo cerebro

Entrada principal al conocimiento del proyecto. **Actual:** monolito modular y SPA con PostgreSQL relacional. **Objetivo:** microservicios, base relacional multitenant y microfrontends. Las notas distinguen evidencia local de diseño propuesto.

## Empezar por los mapas

1. [[cerebro/arquitectura/Estado actual|Qué existe hoy]].
2. [[cerebro/arquitectura/Arquitectura objetivo|Arquitectura objetivo y diagrama general]].
3. [Canvas de arquitectura por módulos](Mapa de arquitectura.canvas): frontend, backend y datos en columnas conectadas.
4. [[cerebro/arquitectura/Migracion incremental|Plan de migración]] y [[cerebro/arquitectura/Criterios de aceptacion|criterios de aceptación]].

## Categorías y colores

| Color | Categoría | Mapas principales |
| --- | --- | --- |
| 🟡 Ámbar | Base de datos | [[cerebro/datos/Multitenancy|Multitenancy]], [[cerebro/datos/Modelo relacional objetivo|modelo relacional]], [[cerebro/datos/Entidades y relaciones|entidades]], [[cerebro/datos/Aislamiento RLS|RLS]] |
| 🟢 Verde | Backend | [[cerebro/backend/Microservicios|Microservicios y todos sus módulos]] |
| 🩵 Cian | Frontend | [[cerebro/frontend/Microfrontends|Microfrontends, shell y módulos]] |
| 🟣 Violeta | Arquitectura y principios | [[cerebro/arquitectura/SOLID|SOLID]], [[cerebro/arquitectura/Patrones de diseno|patrones]], [[cerebro/arquitectura/Flujos del sistema|flujos]] |
| 🔴 Coral | Seguridad | [[cerebro/seguridad/Seguridad y sesion|Seguridad y sesión]] |
| 🟠 Naranja | Operación | [[cerebro/operacion/Calidad y despliegue|Calidad y despliegue]] |
| 🔵 Azul | Gestión | [[cerebro/gestion/Pendientes y decisiones|Pendientes y decisiones]], [[cerebro/gestion/Agentes y colaboracion|colaboración]] |

## Recorridos para comprender el sistema

- Tenant → membresía → contexto autorizado → shell → servicio → política de datos.
- Microfrontend de juego → servicio de juego → reserva → resultado durable → liquidación → ledger.
- Microfrontend de Economía → Pagos → Stripe de prueba → confirmación → Economía → movimiento.

Cada componente tiene una nota con responsabilidad, fuentes, contratos, riesgos y comprobaciones. En [[cerebro/Guia del grafo|Guía del grafo]] puedes encontrar filtros por categoría y cómo mantenerlo.

## Fuentes de verdad

[[README]] · [[ai-context/planfrontend]] · [[ai-context/planbackend]] · [[ai-context/pendientes-frontend]] · [[ai-context/pendientes-backend]] · [[ai-context/comparacion-frontend]] · [[docs/agentes]] · [[AGENTS]].

Los planes históricos no acreditan el estado remoto ni sustituyen rutas, DTOs, servicios, migraciones y pruebas actuales. Este trabajo amplía documentación: no transforma por sí mismo la aplicación ejecutable.
