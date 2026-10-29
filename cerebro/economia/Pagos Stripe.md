---
tags: [economia, pagos]
---
# 💳 Pagos Stripe

Existe código de integración con Stripe en modo de prueba, además de los depósitos simulados. Su presencia no demuestra una pasarela activa en producción ni autoriza usar dinero real.

Flujo de la interfaz: crear checkout → abrir checkout alojado → regresar a `/billetera/retorno` → consultar o sincronizar el pago. El cliente valida que la URL comience con `https://checkout.stripe.com/`.

Rutas del módulo: `POST /api/payments/checkout`, `GET /api/payments/:id` y `GET /api/payments/:id/sync`. La creación requiere autenticación e idempotencia. El webhook se monta por separado antes del parser JSON, según la configuración del servidor.

Estados expuestos al frontend: `PENDIENTE`, `PAGADO`, `FALLIDO`, `EXPIRADO`. El retorno del navegador no debe interpretarse por sí solo como crédito confirmado.

Conecta [[cerebro/economia/Billetera y ledger|Billetera]], [[cerebro/seguridad/Seguridad y sesion|Seguridad]], [[cerebro/arquitectura/Contratos y operaciones|Idempotencia]] y [[cerebro/gestion/Pendientes y decisiones|Verificación pendiente]].

Fuentes: [payment.service.js](../../backend/src/modules/payments/payment.service.js), [payment.routes.js](../../backend/src/modules/payments/payment.routes.js), [wallet.api.ts](../../frontend/src/features/wallet/wallet.api.ts).

## Confirmación y crédito único

El servicio confirma mediante webhook firmado o sincronización que consulta Stripe; comprueba importe, moneda y referencias. La transición condicional a PAGADO y la unicidad del vínculo pago-movimiento protegen contra doble crédito. Esto describe el código local, no una prueba ejecutada del proveedor.

El depósito directo simulado se rechaza en producción con `USE_STRIPE_CHECKOUT`; el retiro permanece como operación simulada.

## Arquitectura objetivo

[[cerebro/backend/servicios/Pagos|Servicio Pagos]] · [[cerebro/datos/entidades/Pago]] · [[cerebro/arquitectura/patrones/Outbox e Inbox|Crédito durable]]
