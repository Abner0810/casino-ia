# Feature Specification: Inventario as-built del Casino IA

**Ficha documental**: `specs/001-casino-as-built/` · **Código revisado**: commit `59502dc` (entonces en `feat/poker-bots-15-names`, integrado en `dev` mediante `28b29ab`)

**Created**: 2026-10-29

**Status**: Revisada — documentación descriptiva del estado local; el estado remoto y la ratificación de la constitución siguen sin confirmación.

**Input**: User description: Documentar como especificación as-built el estado actual del proyecto Casino IA, usando evidencia del repositorio y sin proponer ni implementar funcionalidades nuevas.

## User Scenarios & Testing *(mandatory)*

Esta especificación describe recorridos implementados, no historias nuevas para desarrollo. Las pruebas citadas indican evidencia existente en archivos; no se ejecutaron de nuevo durante esta revisión.

### User Story 1 - Crear cuenta y acceder (Priority: P1)

Una persona crea una cuenta, inicia sesión y accede a las secciones privadas. Puede consultar y editar su nombre, cambiar su contraseña y cerrar sesión.

**Why this priority**: La sesión permite acceder a la billetera, movimientos y juegos.

**Independent Test**: Comprobar las rutas de registro, login, perfil y logout con un usuario de prueba, revisando los mensajes y datos que devuelve la API.

**Acceptance Scenarios**:

1. **Given** una persona no autenticada con datos válidos, **When** se registra, **Then** recibe confirmación y debe iniciar sesión por separado.
2. **Given** una cuenta válida, **When** inicia sesión, **Then** obtiene una sesión y puede visitar una ruta privada.
3. **Given** una sesión activa, **When** consulta o cambia su nombre, **Then** ve su perfil propio actualizado.
4. **Given** una sesión activa, **When** cambia su contraseña proporcionando la actual, **Then** el servidor revoca las sesiones y la persona debe iniciar sesión otra vez.
5. **Given** una sesión activa, **When** cierra sesión, **Then** la interfaz limpia los datos privados y solicita al servidor revocar el refresh token.
6. **Given** datos de registro o perfil fuera de los límites aceptados, **When** los envía, **Then** recibe errores de validación y no se presenta una cuenta o perfil actualizado.

### User Story 2 - Consultar y operar la billetera (Priority: P1)

Una persona autenticada consulta saldo y bono por separado, revisa estadísticas, solicita un depósito simulado en entornos permitidos o inicia un checkout de Stripe de prueba, y solicita un retiro simulado.

**Why this priority**: El saldo es necesario para usar los juegos y comprender los movimientos.

**Independent Test**: Consultar la billetera, realizar una operación válida en un entorno de prueba y volver a consultar el saldo y el historial.

**Acceptance Scenarios**:

1. **Given** una sesión activa, **When** consulta su billetera, **Then** ve saldo, bono y total disponible; las estadísticas aparecen en el balance.
2. **Given** un monto válido y entorno que permite recargas simuladas, **When** solicita una recarga simulada, **Then** el backend registra la acreditación y el movimiento juntos.
3. **Given** un monto permitido para checkout, **When** crea un checkout, **Then** se crea una sesión alojada de Stripe y el saldo no se presenta como acreditado hasta la confirmación verificada del servidor.
4. **Given** un pago pendiente, **When** regresa a la aplicación y consulta o sincroniza su estado, **Then** ve el estado del pago; el retorno del navegador por sí solo no acredita saldo.
5. **Given** saldo suficiente y un monto válido, **When** solicita un retiro simulado, **Then** el backend debita el saldo y registra el movimiento.
6. **Given** monto inválido o saldo insuficiente, **When** envía depósito o retiro, **Then** se muestra el error y la operación rechazada no cambia el saldo confirmado.

### User Story 3 - Revisar movimientos (Priority: P2)

Una persona autenticada consulta sus movimientos, los pagina y los filtra por tipo o intervalo de fechas.

**Why this priority**: Los movimientos permiten revisar depósitos, retiros, apuestas y premios asociados a la propia cuenta.

**Independent Test**: Consultar historial con y sin filtros, y comprobar que los resultados y datos de paginación corresponden al usuario autenticado.

**Acceptance Scenarios**:

1. **Given** una sesión activa, **When** abre movimientos, **Then** recibe elementos con tipo, monto, saldos anterior y posterior, descripción, juego y fecha.
2. **Given** filtros válidos, **When** los aplica, **Then** el historial se limita por tipo/fechas y devuelve información de página.
3. **Given** un filtro o formato de fecha inválido, **When** lo envía, **Then** el backend lo rechaza mediante validación.

### User Story 4 - Jugar Plinko o Ruleta (Priority: P2)

Una persona con saldo consulta la configuración de Plinko o Ruleta, envía una apuesta y observa el resultado que calcula el servidor. Puede consultar sus rondas recientes.

**Why this priority**: Son juegos de una sola apuesta cuyo resultado y liquidación se completan al recibir la respuesta del servidor.

**Independent Test**: Revisar configuración, enviar una apuesta válida, comprobar resultado/saldo y consultar rondas recientes.

**Acceptance Scenarios**:

1. **Given** una apuesta Plinko dentro del rango del riesgo elegido, **When** apuesta, **Then** el servidor devuelve ruta, slot, multiplicador, retorno, resultado neto y saldo actualizado.
2. **Given** una selección válida de Ruleta, **When** apuesta, **Then** el servidor genera un número europeo de 0 a 36, informa color y liquidación, y actualiza el saldo.
3. **Given** una apuesta fuera de límites, selección no válida o saldo insuficiente, **When** intenta jugar, **Then** el servidor rechaza la operación sin confirmar un saldo alterado.
4. **Given** rondas previas, **When** consulta las rondas recientes de cualquiera de estos juegos, **Then** solo recibe registros de su propia cuenta.

### User Story 5 - Jugar Blackjack (Priority: P2)

Una persona inicia una partida, consulta su mesa activa y realiza acciones permitidas por el estado del servidor. Puede recuperar la partida al regresar a la pantalla y consultar partidas recientes.

**Why this priority**: El juego conserva estado entre solicitudes y requiere presentar cartas, manos y acciones válidas.

**Independent Test**: Iniciar una partida, consultar la activa, realizar una acción permitida y revisar el resultado o la partida recuperada.

**Acceptance Scenarios**:

1. **Given** una apuesta dentro de límites y saldo suficiente, **When** inicia una partida, **Then** el servidor crea la mesa y devuelve su estado y acciones permitidas.
2. **Given** una partida activa, **When** consulta la mesa, **Then** ve sus cartas y una carta del crupier oculta hasta que la partida termina.
3. **Given** una mano activa, **When** pide carta, se planta, divide, dobla o se rinde, **Then** la acción se acepta solo si corresponde al estado, versión y saldo disponibles.
4. **Given** una partida propia activa, **When** navega fuera y vuelve, **Then** la interfaz consulta la partida activa y reconstruye la mesa.
5. **Given** una partida inexistente o ajena, **When** solicita su estado o envía una acción, **Then** el servidor responde como recurso no encontrado.

### User Story 6 - Jugar Poker Texas Hold’em (Priority: P2)

Una persona inicia una mano de Texas Hold’em contra tres bots, ve sus cartas privadas y las comunitarias, y decide pasar, subir o retirarse. Puede recuperar la mano y consultar rondas recientes.

**Why this priority**: La mesa conserva el estado de la mano y muestra información distinta según el usuario, los bots y la fase.

**Independent Test**: Iniciar una mano, confirmar que las cartas de los bots permanecen ocultas mientras está activa, avanzar una fase o retirarse y consultar el estado.

**Acceptance Scenarios**:

1. **Given** una apuesta válida y saldo suficiente, **When** inicia una mano, **Then** ve sus dos cartas, tres puestos de bots con nombres elegidos de la lista disponible y una partida activa.
2. **Given** una partida activa, **When** consulta el estado, **Then** ve fase, cartas comunitarias, bote, acciones permitidas y no ve las cartas privadas de los bots.
3. **Given** una versión actual de la partida, **When** pasa, sube o se retira, **Then** el servidor aplica la acción, avanza la mesa y liquida cuando corresponde.
4. **Given** una versión obsoleta de la partida, **When** intenta actuar, **Then** recibe un conflicto y el servidor no aplica la acción.
5. **Given** una partida ajena, **When** consulta su estado o intenta actuar, **Then** recibe recurso no encontrado.

### Edge Cases

- La página se recarga o se pierde la sesión: los tokens solo están en memoria; se requiere volver a iniciar sesión. Las rutas privadas redirigen a login.
- El backend no está configurado o no se puede contactar: la interfaz presenta estado de conexión pendiente o error de red; no inventa cuentas, saldos ni resultados.
- Una mutación monetaria da timeout, error de red o 5xx: el cliente conserva la clave de la operación cuando aplica, no repite automáticamente la mutación y permite consultar la operación exacta o reconciliar lecturas.
- Se repite una clave de idempotencia con el mismo contenido: el servidor devuelve la respuesta registrada; si se usa con otra solicitud, responde conflicto.
- Dos acciones de una partida compiten o usan versión antigua: el servidor puede rechazar con conflicto; la mesa debe consultarse antes de seguir.
- El saldo es insuficiente, la partida ya terminó, el filtro temporal no es válido o el pago no está confirmado: la operación no debe presentarse como exitosa.
- El usuario vuelve desde Stripe sin sesión: la ruta de retorno es privada y requiere autenticación antes de consultar el pago.
- El servidor o la base de datos no están disponibles: el estado del despliegue y del saldo no se infiere desde los archivos de configuración.

### Validaciones de cuenta y perfil observadas

- Registro backend: email válido de hasta 150 caracteres, nombre de 2 a 80 caracteres y contraseña de 8 a 72 caracteres, con un máximo adicional de 72 bytes UTF-8. El formulario aplica los límites de email, nombre y longitud de contraseña; la verificación UTF-8 adicional ocurre en backend.
- Inicio de sesión backend: email válido y contraseña no vacía de hasta 72 bytes UTF-8. El formulario no aplica un máximo de longitud local para la contraseña.
- Perfil: el nombre se recorta y valida entre 2 y 80 caracteres en backend y frontend.
- Cambio de contraseña: backend exige la contraseña actual y una nueva contraseña de 8 a 72 caracteres, con máximo de 72 bytes UTF-8; el formulario limita la longitud en caracteres y confirma coincidencia. Tras el éxito, el frontend cierra la sesión local.

## Requirements *(mandatory)*

### Functional Requirements

Los siguientes requisitos describen capacidades encontradas en el código local revisado; no expresan autorización para desarrollar comportamientos nuevos.

- **FR-001**: El sistema permite registrar una cuenta con email, nombre y contraseña validados; el registro no inicia sesión automáticamente.
- **FR-002**: El sistema permite iniciar sesión, rotar refresh tokens, cerrar sesión y cambiar autenticadamente la contraseña verificando la actual. El cambio revoca los refresh tokens de la cuenta.
- **FR-003**: El sistema limita la consulta y edición del perfil al usuario autenticado y valida el nombre.
- **FR-004**: El sistema muestra saldo, bono y estadísticas de billetera separados en las consultas disponibles.
- **FR-005**: El sistema valida depósitos y retiros simulados, registra cambios de saldo con movimientos y limita las recargas simuladas en producción.
- **FR-006**: El sistema permite crear y consultar sesiones de checkout Stripe de prueba; solo el webhook verificado o la sincronización del servidor puede confirmar y acreditar un pago válido.
- **FR-007**: El sistema permite consultar movimientos propios paginados y filtrados por tipo y fechas.
- **FR-008**: El sistema ofrece acceso autenticado a Plinko, Blackjack, Ruleta europea y Poker Texas Hold’em.
- **FR-009**: En Plinko, el sistema valida riesgo y límites, determina resultado en servidor, persiste la ronda y devuelve trayectoria y liquidación.
- **FR-010**: En Ruleta, el sistema acepta apuestas a pleno, color, paridad, docena o columna, determina un número de 0 a 36 en servidor y persiste la ronda y liquidación.
- **FR-011**: En Blackjack, el sistema persiste el estado de mesa, restringe partidas a su propietario, oculta una carta del crupier mientras la partida sigue activa, y controla acciones por estado y versión.
- **FR-012**: En Poker, el sistema ejecuta una partida Texas Hold’em entre el usuario y tres bots, oculta las cartas privadas de los bots durante el juego y controla acciones por estado y versión.
- **FR-013**: En las rutas revisadas que aplican middleware de validación, el servidor valida body, params y query mediante sus DTOs; las consultas privadas se resuelven con el usuario autenticado. La ruta `GET /api/operations/:key` no aplica actualmente `validateParams` ni un DTO explícito a `key` (ver diferencias y límites documentales).
- **FR-014**: El servidor registra saldo y movimiento en la misma transacción de base de datos para las liquidaciones que usan el helper compartido de ledger.
- **FR-015**: Las mutaciones cubiertas por el middleware de operaciones requieren `Idempotency-Key`; la operación puede consultarse por clave y usuario. No todas las rutas mutables usan necesariamente ese middleware.
- **FR-016**: El cliente conserva access y refresh tokens en memoria, coordina una renovación ante 401, limpia la caché privada al salir de sesión y no reintenta automáticamente mutaciones ante resultados inciertos.
- **FR-017**: La interfaz dispone de rutas públicas y privadas, estados de carga y error, y juegos cargados por ruta; sus pruebas de navegador revisan recorridos y algunos tamaños de viewport con API interceptada.

### Key Entities

- **Usuario**: cuenta con email, nombre, rol, perfil y credenciales protegidas.
- **Sesión**: tokens de acceso y refresh; el cliente guarda ambos en memoria y el servidor rota/revoca refresh tokens.
- **Billetera**: saldo y bono pertenecientes a una cuenta.
- **Movimiento**: registro de depósito, retiro, apuesta o premio, con monto y saldos anterior/posterior.
- **Operación**: intención idempotente ligada a usuario, clave, payload y respuesta registrada.
- **Pago**: checkout asociado a usuario, monto, moneda y estado pendiente, pagado, fallido o expirado.
- **Ronda o partida**: resultado persistido de Plinko, Ruleta, Blackjack o Poker, con estado/propiedad asociados al usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los requisitos funcionales de esta especificación tiene al menos una referencia a código o contrato revisado en la sección de evidencia.
- **SC-002**: Una persona revisora puede identificar en la especificación los cuatro juegos implementados y distinguir sus recorridos y tipos de apuesta/acción.
- **SC-003**: Los flujos de depósito simulado, retiro simulado y checkout Stripe de prueba quedan descritos por separado, y cada uno indica qué confirma el saldo.
- **SC-004**: Cada diferencia identificada entre las fuentes enumeradas en «Evidencia principal revisada», el código local y la evidencia de pruebas/despliegue queda etiquetada con su fuente y límite de verificación.
- **SC-005**: Ninguna afirmación de esta especificación presenta una prueba con API interceptada como prueba de conexión al backend remoto, ni presenta configuración de hosting como evidencia de publicación actual.

## Assumptions

- “Estado actual” significa código y artefactos de prueba/documentación presentes en este checkout al 2026-10-29; no implica que todos estén desplegados o activos en un entorno remoto.
- La existencia de un archivo de test confirma que hay un caso automatizado escrito, pero no que haya sido ejecutado en esta revisión ni que pase actualmente.
- Las cuatro experiencias de juego son las rutas y módulos locales descritos en `backend/src/modules/games/` y `frontend/src/features/games/`.
- El checkout Stripe inspeccionado usa modo de prueba y no representa un cobro real; el saldo se acredita únicamente después de la confirmación que valida el servidor.
- `cerebro/` contiene tanto notas del estado actual como diseños objetivo. Solo las notas marcadas como actuales y corroboradas por código se consideran descripción del producto existente.

## Evidence, discrepancies, and verification limits

### Evidencia principal revisada

| Área | Evidencia local |
| --- | --- |
| Montaje API y webhook | `backend/src/app.js`; `backend/src/modules/*/*.routes.js` |
| Registro, sesión y perfil | `backend/src/modules/auth/{auth.routes.js,auth.service.js,dto/auth.dto.js}`; `backend/src/modules/users/{user.routes.js,user.service.js,dto/user.dto.js}`; `frontend/src/features/auth/`, `frontend/src/features/profile/` |
| Billetera, ledger e idempotencia | `backend/src/modules/{wallet,transactions,operations}/`, incluido `backend/src/modules/operations/operation.routes.js`; `backend/src/shared/{operations.js,utils/ledger.js}`; `frontend/src/features/wallet/`, `frontend/src/features/transactions/`, `frontend/src/shared/api/{http.ts,operations.ts}` |
| Stripe test checkout | `backend/src/modules/payments/`; `backend/src/app.js`; `frontend/src/features/wallet/wallet.api.ts`, `pages/RetornoPagoPage.tsx`; `backend/tests/payments.test.js`; `frontend/src/features/wallet/pages/RetornoPagoPage.test.tsx` |
| Juegos | `backend/src/modules/games/{plinko,blackjack,roulette,poker}/`; `frontend/src/features/games/`; `frontend/src/app/App.tsx` |
| Tests y recorrido navegador | `backend/tests/` (unitarios, integración, HTTP); `frontend/src/**/*.test.*`; `frontend/e2e/casino.spec.ts` |
| Reglas de proyecto y documentación | `AGENTS.md`; `ai-context/{planfrontend.md,pendientes-frontend.md,planbackend.md,pendientes-backend.md,comparacion-frontend.md}`; `docs/agentes.md`; `cerebro/arquitectura/Estado actual.md` y `cerebro/operacion/Calidad y despliegue.md` |

### Diferencias y límites documentales

- `GET /api/operations/:key` aplica autenticación y consulta la operación usando el usuario autenticado, pero `backend/src/modules/operations/operation.routes.js` no aplica `validateParams` ni un DTO explícito al parámetro `key` antes de consultar Prisma. Por tanto, no se afirma que todas las entradas de API tengan validación DTO; es una excepción observable frente al principio III de la constitución y queda documentada como limitación del estado local.
- En registro y cambio de contraseña, el frontend valida el máximo en longitud de cadena, mientras el backend también limita a 72 bytes UTF-8. El formulario de login no limita el máximo localmente, aunque el DTO backend sí limita la contraseña a 72 bytes. Una contraseña multibyte puede pasar la validación visual y ser rechazada por el servidor; sus validaciones no son completamente equivalentes (ver «Validaciones de cuenta y perfil observadas»).
- `ai-context/planfrontend.md` y varios apartados de los planes describen una primera entrega centrada en Plinko y Blackjack y declaran pagos fuera de alcance; el código local actual también monta Ruleta y Poker y contiene checkout Stripe de prueba. Se usan los planes como contexto histórico, no como inventario actual.
- `ai-context/pendientes-frontend.md` registra el 19 de octubre de 2026 un `/health` remoto con 503. `ai-context/comparacion-frontend.md` documenta un Firebase publicado ese día y pruebas con API simulada/interceptada. `cerebro/arquitectura/Estado actual.md` advierte que su revisión del 29 de octubre no comprobó un despliegue remoto. Esta especificación no determina el estado remoto actual.
- `backend/tests/` y `frontend/e2e/casino.spec.ts` contienen pruebas para juegos, pagos, contratos, integración y recorridos. El E2E frontend intercepta la API y el checkout; no prueba pagos reales ni disponibilidad de Render. No se ejecutaron pruebas durante esta tarea documental.
- La constitución de `.specify/memory/constitution.md` contiene `TODO(RATIFICATION_DATE)`. Su fecha formal de ratificación sigue pendiente de confirmación del equipo.
- El segundo cerebro incluye arquitectura objetivo para microservicios, tenants/RLS, microfrontends, outbox/inbox y otras capacidades no visibles en el monolito/SPA actual. Se excluyen del comportamiento implementado. El repositorio no muestra una experiencia funcional de IA del casino ni multijugador con personas reales; los bots de Poker son participantes automatizados implementados en el servicio.
- El rol `ADMIN` existe en el esquema, pero en las rutas revisadas no hay una experiencia o API de administración que permita describir un panel admin.
- El backend y el navegador se describen por contratos locales. La presencia de `render.yaml`, configuración Firebase, workflows o una URL escrita en documentos no acredita por sí sola que el backend esté saludable o que el commit local sea el publicado.

## Fuera de alcance

- Añadir o cambiar juegos, reglas, endpoints, validaciones o flujos de negocio.
- Implementar funciones de IA, multijugador entre personas, panel administrativo, arquitectura de microservicios, multitenancy o microfrontends.
- Confirmar disponibilidad actual de Render, PostgreSQL, Firebase, Stripe o cualquier entorno externo.
- Ejecutar pruebas, cambiar configuración, corregir pruebas o desplegar.

