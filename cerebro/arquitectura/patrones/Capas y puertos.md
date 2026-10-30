---
tags: [arquitectura, patrones]
estado: Actual parcial y objetivo
---
# Capas, Repository, Adapter y DI

## Evidencia

El código separa rutas, servicios y repositorios; no todos los accesos Prisma respetan esa frontera. stripe.client encapsula parte del proveedor y pagos acepta dependencias inyectadas.

Fuente: [payment.service.js](../../../backend/src/modules/payments/payment.service.js).

## Uso en la arquitectura objetivo

Dominio define puertos pequeños; casos de uso orquestan; adaptadores HTTP/Prisma/Stripe implementan detalles. El arranque conecta funciones sin instalar un contenedor DI. Repository recibe tenant/contexto obligatorio y nunca ofrece consultas globales por defecto.

## Límites

No pasar req/res, Prisma completo ni objetos Stripe al dominio. Un adaptador no debe inventar éxitos para cumplir la forma del DTO.

## Verificación

Caso de uso con repositorio/clock de prueba; contratos comunes verifican errores, aislamiento tenant y comportamiento equivalente.

[[cerebro/arquitectura/solid/DIP]] · [[cerebro/arquitectura/Patrones de diseno]] · [[cerebro/arquitectura/SOLID]] · [[cerebro/arquitectura/Arquitectura objetivo]]
