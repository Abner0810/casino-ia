---
tags: [gestion]
actualizado: 2026-10-29
---
# 📌 Pendientes y decisiones

Los documentos originales son referencias históricas, con fechas y alcance propios:

- [[ai-context/pendientes-frontend]] y [[ai-context/pendientes-backend]].
- [[ai-context/comparacion-frontend]].
- [[ai-context/planfrontend]] y [[ai-context/planbackend]].

## Conciliar con el código actual

| Tema | Evidencia local | Próxima comprobación |
| --- | --- | --- |
| Cuatro juegos | [[cerebro/juegos/Juegos]] | Actualizar los planes que solo contemplan dos |
| Idempotencia | [[cerebro/arquitectura/Contratos y operaciones]] | Revisar cobertura por endpoint y pruebas de duplicados |
| Checkout de prueba | [[cerebro/economia/Pagos Stripe]] | Verificar webhook, conciliación y crédito único en ambiente de prueba |
| Publicación | [[cerebro/operacion/Calidad y despliegue]] | Reunir evidencia del commit realmente publicado |

Estas son tareas de comprobación documental y técnica; no se ejecutaron al crear el grafo.

## Registrar una decisión

Anota fecha, problema, decisión, motivo, módulos afectados, evidencia y seguimiento. Enlaza la nota del área para que la decisión aparezca en su grafo local.

Mantener con [[cerebro/gestion/Agentes y colaboracion|Agentes y colaboración]]. Volver a [[cerebro/Inicio|Inicio]].

## Decisiones de arquitectura propuestas · 29 de octubre de 2026

[[cerebro/arquitectura/Arquitectura objetivo]] fija el diseño de referencia: identidad global con membresías por casino; PostgreSQL con propiedad por servicio y filas tenant-scoped; Economía como único escritor monetario; shell con composición ESM versionada. Estas decisiones no están implementadas. Seguir [[cerebro/arquitectura/Migracion incremental]] y exigir [[cerebro/arquitectura/Criterios de aceptacion]].
