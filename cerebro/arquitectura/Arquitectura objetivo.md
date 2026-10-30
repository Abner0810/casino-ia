---
tags: [arquitectura, objetivo]
estado: propuesto
---
# Arquitectura objetivo

Diseño de referencia solicitado: microservicios, PostgreSQL relacional multitenant y microfrontends. Es una propuesta para migrar el código de [[cerebro/arquitectura/Estado actual|hoy]], no una descripción de componentes ya desplegados.

## Vista de conjunto

~~~mermaid
flowchart TB
  subgraph F[Frontend · cian]
    SH[Shell] --> MF[Identidad · Economía · Lobby · cuatro juegos]
  end
  subgraph B[Backend · verde]
    GW[Gateway / BFF] --> ID[Identidad]
    GW --> TE[Tenant]
    GW --> EC[Economía]
    GW --> PA[Pagos]
    GW --> GA[Plinko · Blackjack · Ruleta · Poker]
    GA -->|reservar y liquidar| EC
    PA -->|confirmación durable| EC
  end
  subgraph D[Datos · ámbar]
    DI[(Identidad)]
    DT[(Tenant)]
    DE[(Economía)]
    DP[(Pagos)]
    DG[(Esquema por juego)]
  end
  MF --> GW
  ID --> DI
  TE --> DT
  EC --> DE
  PA --> DP
  GA --> DG
  classDef front fill:#164e63,stroke:#22d3ee,color:#fff
  classDef back fill:#064e3b,stroke:#34d399,color:#fff
  classDef data fill:#78350f,stroke:#fbbf24,color:#fff
  class SH,MF front
  class GW,ID,TE,EC,PA,GA back
  class DI,DT,DE,DP,DG data
~~~

## Reglas de diseño

- [[cerebro/backend/Microservicios|Cada servicio]] posee contratos, lógica, credencial y esquema. Puede compartir inicialmente el cluster PostgreSQL con otros servicios; no sus tablas ni transacciones.
- [[cerebro/datos/Multitenancy|Tenant]] significa casino u organización operadora. Una identidad global puede tener varias membresías, con rol y estado por tenant.
- [[cerebro/backend/servicios/Economia|Economía]] es el único escritor de saldo y movimientos. Los juegos solicitan reservas y liquidaciones; nunca modifican su base.
- [[cerebro/frontend/Microfrontends|Microfrontends]] mantienen React, TypeScript y Vite. El shell administra sesión y composición; cada módulo tiene contrato de montaje y versión.
- [[cerebro/arquitectura/SOLID|SOLID]] y [[cerebro/arquitectura/Patrones de diseno|patrones]] se justifican con responsabilidades y pruebas, no con nombres de carpetas.

## Navegar el diseño

[[cerebro/datos/Modelo relacional objetivo]] · [[cerebro/arquitectura/Consistencia distribuida]] · [[cerebro/arquitectura/Flujos del sistema]] · [[cerebro/arquitectura/Migracion incremental]] · [[cerebro/arquitectura/Criterios de aceptacion]]

Canvas navegable: [Mapa de arquitectura](../Mapa de arquitectura.canvas). Los nodos de este canvas corresponden a notas del grafo.

Las decisiones concretas de este diseño son propuestas del proyecto. Referencias conceptuales: [patrones para microservicios](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/patterns) y [microfrontends](https://micro-frontends.org/).
