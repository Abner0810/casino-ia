---
tags: [arquitectura, solid]
estado: principio objetivo
---
# DIP · Inversión de dependencias

Los casos de uso dependen de puertos de dominio; la infraestructura los implementa y el arranque los conecta.

## Evidencia actual

Pagos permite inyectar algunas dependencias; otros servicios importan Prisma o repositorios concretos directamente.

Fuente: [payment.service.js](../../../backend/src/modules/payments/payment.service.js).

## Aplicación objetivo

Inyectar funciones de repositorio, reloj, generador de IDs y gateway de pago desde composition roots. Los microfrontends usan puertos del shell y no importan authStore de otro módulo.

## Cómo comprobarlo

Ejecutar un caso de uso con un repositorio de prueba sin base de datos; cambiar el proveedor no modifica sus reglas. No hace falta una dependencia nueva.

Volver a [[cerebro/arquitectura/SOLID]]. Aplicar en [[cerebro/backend/Microservicios]] y [[cerebro/frontend/Microfrontends]]. Relacionar con [[cerebro/arquitectura/Patrones de diseno]].
