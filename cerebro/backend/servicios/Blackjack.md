---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🃏 Servicio Blackjack

**Actual:** módulo games/blackjack persiste partida y versión, con operaciones de saldo en la transacción del monolito. **Objetivo:** servicio dueño de partidas, reglas y acciones de Blackjack.

## Datos y privacidad

PartidaBlackjack conserva baraja, dealer, manos, estado, resultado y versión. Añadir tenantId y referencias de reservas/liquidaciones; esquema y credencial propios. El mazo y carta oculta no se exponen al cliente.

La restricción de una partida activa debe evaluarse por tenant–usuario en el modelo objetivo. No aplicar una unicidad global por usuario que bloquee una partida de otro operador.

## Acciones y economía objetivo

Inicio, pedir, plantarse, dividir, doblar y rendirse mantienen una máquina de estados versionada. La acción debe comprobar propietario, tenant y versión, además de su clave idempotente.

Inicio reserva saldo en [[cerebro/backend/servicios/Economia|Economía]]; split/double requieren reserva adicional antes de confirmar el cambio de apuesta. No aceptar una transición de cartas irreversible y descubrir después que no había saldo.

La liquidación de manos se persiste como intención duradera, se envía a Economía y se confirma por referencia estable. Un reinicio recupera la saga; nunca vuelve a repartir ni duplica el premio.

Las consultas de activa/ID permiten reconstruir el estado público; la vista financiera distingue partida terminada de liquidación pendiente.

## SOLID y pruebas

SRP separa motor y orquestación; State explicita acciones permitidas; DIP abstrae Economía/repositorio. LSP exige que adaptadores de prueba y persistencia respeten concurrencia y errores del puerto.

Probar natural, split, doble, rendición, versión obsoleta, dos pestañas, caída después de reservar y carta oculta en errores/respuestas.

Fuentes: [rutas](../../../backend/src/modules/games/blackjack/blackjack.routes.js), [servicio](../../../backend/src/modules/games/blackjack/blackjack.service.js), [schema.prisma](../../../backend/prisma/schema.prisma).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Blackjack|Interfaz relacionada]] · [[cerebro/datos/entidades/PartidaBlackjack]]
