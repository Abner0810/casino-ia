---
tags: [arquitectura, solid]
estado: principio objetivo
---
# LSP · Sustitución

Dos implementaciones del mismo puerto conservan precondiciones, resultados, errores y garantías.

## Evidencia actual

No hay una jerarquía polimórfica relevante que permita afirmar cumplimiento global.

Fuente: [stripe.client.js](../../../backend/src/modules/payments/stripe.client.js).

## Aplicación objetivo

Repositorios tenant-aware, adaptadores de pago y módulos mount/unmount deben respetar contratos. Un simulador de pago no puede declarar éxito antes de confirmar ni omitir aislamiento tenant.

## Cómo comprobarlo

La misma suite de contrato se ejecuta sobre cada adaptador; rechaza tenant ausente y conserva semántica de duplicados.

Volver a [[cerebro/arquitectura/SOLID]]. Aplicar en [[cerebro/backend/Microservicios]] y [[cerebro/frontend/Microfrontends]]. Relacionar con [[cerebro/arquitectura/Patrones de diseno]].
