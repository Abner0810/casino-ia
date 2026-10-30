---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🎯 Servicio Plinko

**Actual:** módulo games/plinko dentro del monolito, con saldo y ronda en una transacción compartida. **Objetivo:** servicio dueño de reglas, RNG y rondas de Plinko.

## Responsabilidad y datos

RondaPlinko conserva apuesta, riesgo, multiplicador, ganancia, semilla y trayectoria. Incorporar tenantId y referencias externas de reserva/liquidación; esquema y credencial propios. Ninguna FK remota a User o Wallet.

Las reglas y rangos vigentes provienen del servicio/configuración. El servidor decide el resultado; la interfaz representa la ruta sin generar una liquidación alternativa.

## Operación distribuida objetivo

- Recibir apuesta idempotente con contexto tenant–usuario validado.
- Persistir intención y coordinar reserva en [[cerebro/backend/servicios/Economia|Economía]].
- Generar y guardar un único resultado durable; no volver a sortear por timeout o reentrega.
- Liquidar por referencia estable y confirmar el estado financiero antes de presentarlo como saldo definitivo.
- Publicar avances con outbox e incorporar respuestas deduplicadas mediante inbox.

La saga necesita estados de recuperación para reserva confirmada sin resultado y resultado persistido sin liquidación. Si existe incertidumbre, consultar/reconciliar; no devolver automáticamente la apuesta y mantener simultáneamente un premio pendiente.

## SOLID y pruebas

SRP separa motor de transporte y dinero; DIP usa puertos RNG, repositorio y Economía. OCP permite variar reglas por configuración versionada sin tocar autenticación. Repository conserva filtros tenant en consultas y escrituras.

Probar resultado estable tras reintento, reserva rechazada, doble liquidación, acceso cruzado y diferencia entre retorno bruto y ganancia neta.

Fuentes: [servicio](../../../backend/src/modules/games/plinko/plinko.service.js), [configuración](../../../backend/src/modules/games/plinko/plinko.config.js), [rutas](../../../backend/src/modules/games/plinko/plinko.routes.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Plinko|Interfaz relacionada]] · [[cerebro/datos/entidades/RondaPlinko]]
