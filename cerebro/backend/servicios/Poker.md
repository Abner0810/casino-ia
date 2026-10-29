---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# ♠️ Servicio Póker

**Actual:** games/poker implementa Texas Hold’em contra banca en el monolito; VIDEO_POKER permanece como valor legado del esquema. **Objetivo:** servicio dueño de la partida, fases y decisiones del póker.

## Datos e invariantes

PartidaPoker conserva cartas, banca, comunitarias, baraja, fase, apuesta total, resultado y versión. Añadir tenantId y referencias económicas externas; esquema y credencial propios, sin FK a Wallet/User remotos.

El servidor oculta cartas de banca durante la mano y nunca entrega el mazo. La consulta de activa/ID conserva ownership y permite recuperación de la vista pública.

## Flujo distribuido objetivo

Inicio coordina la reserva con [[cerebro/backend/servicios/Economia|Economía]]. Cada aumento que exige saldo debe obtener confirmación de reserva antes de avanzar de forma irreversible. Check/raise/fold y cambios de fase deben validar versión y estado.

La resolución guarda el resultado una vez, registra intención de liquidación y usa una referencia idempotente. Outbox/inbox y recuperación de saga permiten continuar después de un reinicio sin volver a repartir ni acreditar doble.

El diseño debe fijar una política de abandono/expiración para partidas y reservas; cerrar la pestaña no equivale automáticamente a fold ni a devolución.

## SOLID y pruebas

State organiza fases y transiciones; SRP separa evaluador de manos, coordinador de partida y adaptador económico. DIP evita importar repositorios de Economía. No imponer un mismo contrato de acciones a Plinko y Póker: ISP mantiene puertos por capacidad.

Probar fases preflop/flop/turn/river, comparación de manos, raise sin saldo, fold, acciones concurrentes, reentrega y ocultación de banca/mazo.

Fuentes: [servicio](../../../backend/src/modules/games/poker/poker.service.js), [lógica](../../../backend/src/modules/games/poker/poker.logic.js), [rutas](../../../backend/src/modules/games/poker/poker.routes.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Poker|Interfaz relacionada]] · [[cerebro/datos/entidades/PartidaPoker]]
