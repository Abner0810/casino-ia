# Tareas: Documentación as-built del Casino IA

**Entrada**: [spec.md](spec.md) · **Plan descriptivo**: [plan.md](plan.md)

**Alcance**: Tareas para completar o verificar documentación del comportamiento local existente. No son instrucciones para implementar el producto. No se incluyen fases Setup/Foundational, ni tareas de ejecución de pruebas, cambios de código, configuración o despliegue.

**Evidencia de diseño**: [research.md](research.md), [data-model.md](data-model.md), [contratos API locales](contracts/api-local.md), [quickstart.md](quickstart.md).

## Formato

Cada tarea indica su ID, paralelización cuando aplica, historia de usuario y archivos concretos. Una tarea se cierra cuando se coteja la afirmación con la fuente citada y se actualiza el artefacto SDD con el resultado verificado o con su estado no confirmado.

## Phase 1: Verificar fuentes transversales

**Propósito**: Cotejar por separado estructura, persistencia, contratos y evidencia documental antes de revisar las historias.

- [x] T001 [P] Contrastar el resumen de arquitectura y rutas con `backend/src/app.js`, `frontend/src/app/App.tsx`, `frontend/src/main.tsx` y los manifiestos; corregir únicamente afirmaciones as-built en `specs/001-casino-as-built/plan.md`.
- [x] T002 [P] Cotejar las entidades, campos, relaciones y estados descritos con `backend/prisma/schema.prisma` y `backend/src/shared/utils/ledger.js`; corregir únicamente `specs/001-casino-as-built/data-model.md`.
- [x] T003 [P] Verificar métodos, rutas, autenticación, DTOs, límites y alcance real de idempotencia contra `backend/src/modules/auth/auth.routes.js`, `backend/src/modules/auth/dto/auth.dto.js`, `backend/src/modules/users/user.routes.js`, `backend/src/modules/users/dto/user.dto.js`, `backend/src/modules/transactions/transaction.routes.js`, `backend/src/modules/transactions/dto/transaction.dto.js`, `backend/src/modules/operations/operation.routes.js`, `backend/src/modules/payments/payment.routes.js`, `backend/src/modules/payments/dto/payment.dto.js`, `backend/src/modules/games/plinko/plinko.routes.js`, `backend/src/modules/games/plinko/dto/plinko.dto.js`, `backend/src/modules/games/blackjack/blackjack.routes.js`, `backend/src/modules/games/blackjack/dto/blackjack.dto.js`, `backend/src/modules/games/roulette/roulette.routes.js`, `backend/src/modules/games/roulette/dto/roulette.dto.js`, `backend/src/modules/games/poker/poker.routes.js`, `backend/src/modules/games/poker/dto/poker.dto.js`, `backend/src/middlewares/operation.handler.js` y `frontend/src/features/games/games.api.ts`; dejar explícita en el contrato documental cualquier ruta sin validador; corregir únicamente `specs/001-casino-as-built/contracts/api-local.md`.
- [x] T004 [P] Revisar la evidencia histórica y límites de verificación en `backend/README.md`, `ai-context/comparacion-frontend.md`, `ai-context/pendientes-backend.md`, `ai-context/pendientes-frontend.md` y `cerebro/arquitectura/Estado actual.md`; registrar fechas y qué no verifican en `specs/001-casino-as-built/research.md`.

## Phase 2: User Story 1 - Cuenta, sesión y perfil (Priority: P1)

**Meta documental**: Confirmar que el recorrido y sus restricciones describen lo implementado.

**Criterio de verificación independiente**: Cada afirmación FR-001–FR-003 y sus escenarios coincide con DTOs/rutas/servicios y con la API/UI local; cualquier comportamiento solo documentado se marca como no confirmado.

- [x] T005 [US1] Cotejar registro, login, refresh, logout, cambio de contraseña y edición/consulta de perfil con `backend/src/modules/auth/auth.routes.js`, `backend/src/modules/auth/auth.service.js`, `backend/src/modules/auth/dto/auth.dto.js`, `backend/src/modules/users/user.routes.js`, `backend/src/modules/users/user.service.js`, `backend/src/modules/users/dto/user.dto.js`, `frontend/src/features/auth/`, `frontend/src/features/profile/` y sus pruebas; corregir solo los escenarios y FR-001–FR-003 en `specs/001-casino-as-built/spec.md`.

## Phase 3: User Story 2 - Billetera y pagos (Priority: P1)

**Meta documental**: Separar saldos y operaciones simuladas del checkout Stripe de prueba, describiendo qué evento confirma un crédito.

**Criterio de verificación independiente**: Los escenarios y FR-004–FR-006 coinciden con validaciones de monto, persistencia del ledger, estado de pago y pruebas existentes; no afirman cobros reales.

- [x] T006 [US2] Cotejar saldo/bono, balance, depósito/retiro, errores de saldo insuficiente, checkout, webhook, sincronización y retorno con `backend/src/modules/wallet/`, `backend/src/modules/transactions/`, `backend/src/modules/payments/`, `backend/src/shared/utils/ledger.js`, `backend/src/config/env.js`, `frontend/src/features/wallet/`, `frontend/src/features/transactions/`, `backend/tests/money.test.js`, `backend/tests/payments.test.js`, `frontend/src/features/wallet/wallet.api.test.ts`, `frontend/src/features/wallet/pages/BilleteraPage.test.tsx` y `frontend/src/features/wallet/pages/RetornoPagoPage.test.tsx`; corregir solo User Story 2 y FR-004–FR-006 en `specs/001-casino-as-built/spec.md`.

## Phase 4: User Story 3 - Historial de movimientos (Priority: P2)

**Meta documental**: Verificar campos, filtros y paginación del historial propio.

**Criterio de verificación independiente**: Los escenarios y FR-007 coinciden con DTO, servicio, cliente y pantalla; no se atribuye al historial información que no entregue el backend.

- [x] T007 [US3] Cotejar filtros, fechas, tipos, paginación y propiedad con `backend/src/modules/transactions/transaction.routes.js`, `backend/src/modules/transactions/transaction.service.js`, `backend/src/modules/transactions/dto/transaction.dto.js`, `frontend/src/features/transactions/` y `frontend/src/features/transactions/pages/MovimientosPage.tsx`; corregir solo User Story 3 y FR-007 en `specs/001-casino-as-built/spec.md`.

## Phase 5: User Story 4 - Plinko y Ruleta (Priority: P2)

**Meta documental**: Confirmar entradas, resultados del servidor, rondas y liquidación de juegos de apuesta única.

**Criterio de verificación independiente**: Los escenarios y FR-008–FR-010 describen únicamente los contratos y reglas actuales de Plinko/Ruleta.

- [x] T008 [US4] Cotejar riesgo, límites, configuración, ruta de resultado, historial y actualización de saldo Plinko con `backend/src/modules/games/plinko/`, `backend/tests/plinko.test.js`, `frontend/src/features/games/plinko/` y `frontend/src/features/games/games.api.ts`; corregir solo la parte Plinko de User Story 4 y FR-009 en `specs/001-casino-as-built/spec.md`.
- [x] T009 [US4] Cotejar ruleta europea, tipos de apuesta, selecciones, pagos, configuración, rondas y actualización de saldo con `backend/src/modules/games/roulette/`, `backend/tests/roulette.test.js`, `frontend/src/features/games/roulette/` y `frontend/src/features/games/games.api.ts`; corregir solo la parte Ruleta de User Story 4 y FR-010 en `specs/001-casino-as-built/spec.md`.

## Phase 6: User Story 5 - Blackjack (Priority: P2)

**Meta documental**: Verificar recuperación de mesa, cartas ocultas, acciones/versionado y liquidación descritos.

**Criterio de verificación independiente**: Los escenarios y FR-011 coinciden con servicio, DTO, persistencia, ownership y pruebas presentes; el E2E mockeado no se presenta como integración remota.

- [x] T010 [US5] Cotejar inicio, estado activo, consulta por ID, acciones, reglas de mano, ownership y respuestas de error con `backend/src/modules/games/blackjack/`, `backend/tests/blackjack.test.js`, `backend/tests/integration/backend.integration.mjs`, `frontend/src/features/games/blackjack/` y sus pruebas; corregir solo User Story 5 y FR-011 en `specs/001-casino-as-built/spec.md`.

## Phase 7: User Story 6 - Poker Texas Hold’em (Priority: P2)

**Meta documental**: Verificar mesa de usuario y tres bots, privacidad de cartas, fases, acciones y recuperación.

**Criterio de verificación independiente**: Los escenarios y FR-012 corresponden a Texas Hold’em y a la respuesta actual del servidor; no se describe multijugador humano.

- [x] T011 [US6] Cotejar modalidad, puestos/bots/nombres, fases, cartas ocultas, bote, acciones versionadas, partida activa y rondas con `backend/src/modules/games/poker/`, `backend/tests/poker.test.js`, `frontend/src/features/games/poker/`, `frontend/src/features/games/games.api.ts` y el escenario Poker de `frontend/e2e/casino.spec.ts`; corregir solo User Story 6 y FR-012 en `specs/001-casino-as-built/spec.md`.

## Phase 8: Cierre documental transversal

**Propósito**: Revisar afirmaciones que cruzan recorridos y cerrar trazabilidad sin ejecutar suites ni cambiar producto.

- [x] T012 Revisar FR-013–FR-017, validación, propiedad, ledger, claves idempotentes, sesión, caché, estados UI y movimiento reducido contra `backend/src/modules/operations/operation.routes.js`, `backend/src/middlewares/`, `backend/src/shared/`, `frontend/src/shared/api/http.ts`, `frontend/src/shared/api/operations.ts`, `frontend/src/features/auth/`, `frontend/src/app/providers.tsx`, `frontend/src/styles/`, `frontend/src/shared/hooks/useReducedMotion.ts`, `frontend/src/shared/api/http.test.ts`, `frontend/src/shared/api/operations.test.ts` y `AGENTS.md`; corregir solo afirmaciones/evidencia en `specs/001-casino-as-built/spec.md`.
- [x] T013 Revisar objetivos no especificados, pruebas históricas y estado de publicación contra `ai-context/`, `docs/`, `cerebro/`, `backend/README.md`, `frontend/firebase.json` y `.github/workflows/`; mantener como no confirmados los hechos externos sin evidencia fechada en `specs/001-casino-as-built/plan.md`, `specs/001-casino-as-built/research.md` y `specs/001-casino-as-built/quickstart.md`.
- [x] T014 Comparar requisitos, entidades, contratos, plan y research para que no haya contradicciones ni diseño futuro presentado como actual; confirmar que la checklist de calidad sigue describiendo la especificación y registrar pendientes de decisión humana en `specs/001-casino-as-built/spec.md`, `specs/001-casino-as-built/plan.md`, `specs/001-casino-as-built/research.md`, `specs/001-casino-as-built/data-model.md`, `specs/001-casino-as-built/contracts/api-local.md`, `specs/001-casino-as-built/quickstart.md` y `specs/001-casino-as-built/checklists/requirements.md`.

## Dependencias y orden de ejecución

- **Fase 1**: T001–T004 pueden ejecutarse en paralelo porque verifican fuentes y actualizan artefactos distintos.
- **Fases 2–7**: T005–T011 se ejecutan después de la Fase 1. Se hacen en orden para evitar ediciones concurrentes del mismo `spec.md`; cada historia es una revisión documental delimitada.
- **Fase 8**: T012–T014 se ejecutan después de las historias para cerrar requisitos transversales, límites externos y consistencia de todos los artefactos.
- No hay dependencia de implementación, despliegue ni pruebas nuevas.

## Oportunidades de paralelización

```text
T001 (estructura/plan) ─┐
T002 (modelo de datos) ─┼─> T005–T011 (historias, secuenciales en spec.md) -> T012 -> T013 -> T014
T003 (contratos API)   ─┤
T004 (histórico/NFR)   ─┘
```

Las tareas T001–T004 son el único bloque paralelo marcado `[P]`; cada una modifica un artefacto diferente. Las revisiones de historia no se marcan paralelas porque actualizan el mismo archivo de especificación.

## Estrategia documental

1. **MVP de documentación**: T001–T005, para dejar trazable la estructura del sistema y el recorrido de cuenta/sesión/perfil.
2. **Cobertura funcional restante**: T006–T011, para documentar billetera, movimientos y cuatro juegos.
3. **Cierre**: T012–T014, para validar requisitos compartidos, evidencia histórica y límites de verificación.

Este MVP es un orden de revisión de documentos, no una entrega de software. No se ejecutan comandos de pruebas ni se editan archivos del producto.

## Conteo por historia

| Historia | Tareas |
|---|---:|
| US1 - Cuenta, sesión y perfil | 1 |
| US2 - Billetera y pagos | 1 |
| US3 - Movimientos | 1 |
| US4 - Plinko y Ruleta | 2 |
| US5 - Blackjack | 1 |
| US6 - Poker | 1 |
| Transversales sin historia | 7 |
| **Total** | **14** |

