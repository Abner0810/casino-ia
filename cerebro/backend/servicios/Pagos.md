---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 💳 Servicio Pagos

**Actual:** el módulo payments integra Stripe en modo prueba y puede acreditar usando la transacción compartida del monolito. **Objetivo:** aislar al proveedor externo sin permitir que Pagos escriba la wallet.

## Responsabilidad y datos

Propietario de Pago, referencias de checkout/proveedor, recepción de notificaciones, estados de confirmación y operaciones locales. Usa esquema, credencial y claves del proveedor exclusivas; ninguna credencial aparece en notas ni variables públicas.

Crear checkout exige tenant y usuario autorizados e idempotencia. El tenant del webhook se resuelve contra el pago persistido y su configuración, nunca solo desde metadatos enviados por un navegador.

## Flujo distribuido objetivo

1. Persistir intento y crear/reconciliar checkout con clave estable del proveedor.
2. Verificar firma del webhook sobre cuerpo crudo, o consultar al proveedor mediante sync autorizado.
3. Validar identidad de pago, importe, moneda y transición; guardar confirmación y outbox en la misma transacción local.
4. Enviar el hecho confirmado a [[cerebro/backend/servicios/Economia|Economía]], que deduplica y acredita.
5. Registrar el acuse de crédito y mostrar por separado pago confirmado/crédito pendiente o confirmado.

El retorno del navegador no confirma un pago. Los reintentos del webhook son esperables; outbox/inbox y claves de evento evitan acreditar dos veces. La caída de Economía conserva la confirmación para entrega posterior.

## SOLID y pruebas

Adapter a Stripe y DIP separan reglas de pago del cliente HTTP del proveedor. ISP diferencia checkout, verificación y consulta. SRP deja el saldo bajo Economía.

Probar webhook duplicado, firma inválida, moneda/importe ajenos, pertenencia incorrecta, crédito tardío y recuperación tras confirmar antes de publicar. La documentación no ejecuta Stripe ni habilita dinero real.

Fuentes: [payment.service.js](../../../backend/src/modules/payments/payment.service.js), [payment.routes.js](../../../backend/src/modules/payments/payment.routes.js), [stripe.client.js](../../../backend/src/modules/payments/stripe.client.js), [app.js](../../../backend/src/app.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/frontend/Microfrontends]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Economia|Interfaz relacionada]] · [[cerebro/datos/entidades/Pago]] · [[cerebro/datos/entidades/Outbox e Inbox]]
