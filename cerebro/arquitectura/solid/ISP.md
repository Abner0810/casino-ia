---
tags: [arquitectura, solid]
estado: principio objetivo
---
# ISP · Segregación de interfaces

Cada consumidor recibe únicamente las capacidades que utiliza.

## Evidencia actual

Los repositorios se separan por módulo, pero algunos casos reciben Prisma completo o dependencias amplias.

Fuente: [wallet.api.ts](../../../frontend/src/features/wallet/wallet.api.ts).

## Aplicación objetivo

Separar WalletQueries, WalletCommands, PaymentGateway, SessionPort, NavigationPort y HttpPort. Una pantalla de historial no necesita capacidad de débito.

## Cómo comprobarlo

Un doble de pruebas de consulta no implementa pagos ni apuestas; un microfrontend público no recibe capacidades privadas.

Volver a [[cerebro/arquitectura/SOLID]]. Aplicar en [[cerebro/backend/Microservicios]] y [[cerebro/frontend/Microfrontends]]. Relacionar con [[cerebro/arquitectura/Patrones de diseno]].
