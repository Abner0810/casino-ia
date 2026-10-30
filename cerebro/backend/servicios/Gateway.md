---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🚪 Gateway y composición

**Actual:** app.js centraliza entrada, rutas, CORS, límites, errores y health en una API Express. **Objetivo:** gateway como infraestructura de entrada a servicios, sin reglas de liquidación ni estado de partida.

## Responsabilidades objetivo

- Resolver dominio/configuración permitida del tenant y validar credenciales para la ruta.
- Propagar contexto autenticado, requestId, deadlines y correlación entre servicios.
- Aplicar enrutamiento, límites por tenant/usuario y normalización estable de errores.
- Componer lecturas de catálogo y acceso al juego para [[cerebro/frontend/Microfrontends|Microfrontends]].
- Mantener compatibilidad temporal mientras cada módulo abandona el monolito.

Cada servicio vuelve a validar contexto y permisos. Una cabecera interna solo es confiable dentro de un canal autenticado y controlado; no reenviar cabeceras arbitrarias del cliente como identidad.

## Límites de composición

El catálogo/acceso combina configuración y lectura de saldo; no garantiza fondos para una apuesta posterior. La reserva real ocurre en [[cerebro/backend/servicios/Economia|Economía]] cuando el juego acepta la operación.

No centralizar operaciones idempotentes en una tabla global del gateway: el dueño del comando conserva su resultado. Consultar una operación requiere enrutar hacia el servicio propietario con contexto tenant–usuario.

La caída de un servicio debe producir un error localizado y plazo de espera, sin reintentar automáticamente apuestas o pagos inciertos. Circuit breaker y bulkhead son patrones futuros; no hay un gateway independiente instalado actualmente.

## SOLID y aceptación

SRP limita el gateway al borde y composición; ISP separa puertos de lectura; DIP evita que dependa de Prisma de los servicios. Strangler permite migrar rutas sin exigir un cambio simultáneo de toda la interfaz.

Probar servicio caído, tenant manipulado, llamada directa al servicio, requestId y timeout tras comando confirmado. Definir health/readiness por servicio antes del despliegue.

Fuente actual: [app.js](../../../backend/src/app.js), [auth.middleware.js](../../../backend/src/middlewares/auth.middleware.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/datos/Multitenancy]].
