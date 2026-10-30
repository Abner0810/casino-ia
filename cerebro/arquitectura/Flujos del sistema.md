---
tags: [arquitectura, objetivo]
---
# Flujos del sistema

Diagramas del objetivo, no tráfico capturado. Cada recorrido debe transportar contexto tenant verificado y correlación de operación.

## Entrada y sesión

[[cerebro/frontend/microfrontends/Shell|Shell]] → [[cerebro/backend/servicios/Gateway|Gateway]] → [[cerebro/backend/servicios/Tenant|Tenant]] → [[cerebro/backend/servicios/Identidad|Identidad]] → [[cerebro/datos/entidades/TenantMembership|Membresía]]. El dominio/subdominio selecciona organización; la membresía autoriza el acceso. Un cambio de organización debe emitir contexto válido nuevo, limpiar caché y cancelar respuestas anteriores.

## Juego y liquidación

~~~mermaid
sequenceDiagram
  participant UI as Microfrontend juego
  participant G as Servicio juego
  participant E as Economía
  UI->>G: intención con clave estable
  G->>E: reservar apuesta
  E-->>G: reserva confirmada
  G->>G: persistir estado y outbox
  G-->>E: liquidación durable
  E->>E: deduplicar y aplicar ledger
  E-->>G: confirmación durable
  G-->>UI: consultar resultado y estado económico
~~~

Véase [[cerebro/arquitectura/Consistencia distribuida]]. Las flechas durables requieren implementación de outbox/inbox; no son llamadas actualmente existentes.

## Checkout y crédito

[[cerebro/frontend/microfrontends/Economia|MF Economía]] → [[cerebro/backend/servicios/Pagos|Pagos]] → Stripe Checkout → webhook firmado o conciliación → outbox de pago confirmado → inbox de [[cerebro/backend/servicios/Economia|Economía]] → [[cerebro/datos/entidades/Movimiento|Movimiento]]. El retorno del navegador consulta estado, nunca acredita.

## Consulta del historial

MF Economía → Economía → proyección filtrada por tenant y usuario. Si una proyección es eventual, indicar fecha/estado; la autorización no depende de información atrasada.

Relaciona [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/arquitectura/patrones/Outbox e Inbox]] y [[cerebro/arquitectura/patrones/Idempotencia]].
