---
tags: [arquitectura, objetivo]
---
# Consistencia distribuida

Hoy [[cerebro/arquitectura/Estado actual|userTransaction]] puede agrupar partida, billetera y movimiento en una sola transacción. Una llamada HTTP o evento entre servicios no conserva esa atomicidad.

## Protocolo propuesto

1. Persistir una intención de juego con tenant, usuario y operación estable, sin sortear repetidamente.
2. Solicitar reserva idempotente a [[cerebro/backend/servicios/Economia|Economía]]. Sin reserva confirmada no aceptar la apuesta.
3. Persistir el resultado o avance del juego junto con su outbox local. Un fallo de entrega nunca vuelve a generar cartas o resultado.
4. Enviar liquidación con identidad estable; Economía consume con inbox y escribe saldo, movimiento y outbox en su transacción.
5. Mostrar liquidación pendiente hasta confirmarla. Un timeout no significa fracaso del negocio.

La [[cerebro/arquitectura/patrones/Saga|saga]] conserva estados, reanuda trabajo y permite consultar la intención. Una reserva se libera solo cuando consta que no hubo resultado liquidable; nunca por un timeout aislado. En Blackjack y Poker las acciones con apuesta adicional necesitan reserva adicional identificada por acción y versión.

## Fallos que deben tener salida

| Fallo | Tratamiento objetivo |
| --- | --- |
| Respuesta de reserva perdida | Consultar o repetir con la misma identidad |
| Resultado persistido, Economía caída | Outbox pendiente; juego no se vuelve a sortear |
| Mensaje duplicado | Inbox y clave económica evitan segundo crédito |
| Pago confirmado, crédito pendiente | Mantener estados separados y reconciliar |
| Evento de otro tenant | Rechazar y auditar; nunca adoptar su contexto sin validar |

No se promete exactly-once de transporte. El objetivo es entrega al menos una vez y efecto económico idempotente, con reintentos internos limitados y conciliación.

Fuentes actuales: [transaction.js](../../backend/src/shared/transaction.js), [operations.js](../../backend/src/shared/operations.js). Ver [[cerebro/datos/entidades/Reserva y liquidacion]], [[cerebro/datos/entidades/Outbox e Inbox]] y [[cerebro/arquitectura/Criterios de aceptacion]].
