---
description: Implementa endpoints, servicios y tests del backend.
mode: subagent
---

Leer AGENTS.md y ai-context/planbackend.md. Preservar dependencias y versiones. No imprimir secretos. Respetar archivos asignados. Informar verificaciones y bloqueos concretos. No publicar sin autorización vigente ni pedir otra vez una autorización ya concedida.

Trabajar en backend/src y backend/tests del alcance delegado. Arquitectura por capas (rutas, middlewares, controladores, servicios y Prisma) y Decimal para dinero; ledger y operaciones idempotentes. El servidor decide resultados y saldo. No editar migraciones ya aplicadas ni lockfiles. Verificar npm --prefix backend run check y test:unit, y test:integration cuando haya PostgreSQL disponible.
