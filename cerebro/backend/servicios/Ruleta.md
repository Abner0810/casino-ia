---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🎡 Servicio Ruleta

**Actual:** módulo games/roulette ejecutado en el monolito. **Objetivo:** servicio dueño de configuración, apuestas y resultados de ruleta europea.

## Responsabilidad y propiedad

RondaRuleta registra apuesta, tipo, selección, número, multiplicador y ganancia. El resultado 0–36 se decide en el servidor. Conservar la versión de reglas asociada a la apuesta para interpretar rondas históricas.

El esquema relacional del servicio añade tenantId y referencias de operación/reserva. FK solo locales; nunca leer ni escribir directamente Wallet de otro servicio.

## Flujo objetivo

Validar apuesta y contexto → registrar intención → reservar con [[cerebro/backend/servicios/Economia|Economía]] → guardar resultado único → liquidar → confirmar. Las etapas entre servicios son recuperables, no una transacción SQL global.

Idempotencia local vincula tenant–usuario–clave con el payload. La reentrega recupera el mismo resultado, sin girar de nuevo. Outbox/inbox sostiene confirmaciones si cae el canal de comunicación.

La configuración y el historial exponen solo datos públicos del tenant y del propietario. Las políticas por tenant deben estar validadas por el servidor; colores y etiquetas de la interfaz no alteran probabilidades ni premios.

## SOLID y pruebas

SRP separa evaluación de apuesta, persistencia y liquidación. Strategy es una opción para evaluadores de pleno/color/paridad/docena/columna cuando su variación lo justifique; no declarar que ya existe una jerarquía de estrategias.

Probar selección fuera de rango, cero, retorno por tipo, saldo insuficiente, duplicados, tenant ajeno y caída entre resultado y crédito.

Fuentes: [rutas](../../../backend/src/modules/games/roulette/roulette.routes.js), [lógica](../../../backend/src/modules/games/roulette/roulette.logic.js), [configuración](../../../backend/src/modules/games/roulette/roulette.config.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Ruleta|Interfaz relacionada]] · [[cerebro/datos/entidades/RondaRuleta]]
