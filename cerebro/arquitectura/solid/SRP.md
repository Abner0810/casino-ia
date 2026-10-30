---
tags: [arquitectura, solid]
estado: principio objetivo
---
# SRP · Responsabilidad única

Separar las razones de cambio: reglas de liquidación, transporte HTTP y acceso a datos no pertenecen al mismo módulo.

## Evidencia actual

Hay rutas, servicios y repositorios. payment.service reúne checkout, webhook, conciliación y serialización: hay margen para separar casos de uso.

Fuente: [payment.service.js](../../../backend/src/modules/payments/payment.service.js).

## Aplicación objetivo

Crear casos de uso CrearCheckout, ConfirmarPago y ConsultarPago. Economía mantiene ledger; el microfrontend de Economía representa respuestas, sin calcular créditos definitivos.

## Cómo comprobarlo

Una prueba de regla monetaria corre sin Express ni Stripe. Cambiar la serialización de la API no modifica la liquidación.

Volver a [[cerebro/arquitectura/SOLID]]. Aplicar en [[cerebro/backend/Microservicios]] y [[cerebro/frontend/Microfrontends]]. Relacionar con [[cerebro/arquitectura/Patrones de diseno]].
