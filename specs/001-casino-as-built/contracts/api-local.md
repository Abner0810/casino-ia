# Contratos HTTP locales observados

Este inventario resume rutas montadas en `backend/src/app.js` y sus routers/DTOs locales. La API base es `/api`; los detalles completos de payload/respuesta se consultan en los archivos fuente y en `openapi.json`. No es una propuesta de contrato nuevo ni evidencia de disponibilidad remota.

## Rutas

| Área | Método y ruta | Acceso/validación y comportamiento resumido |
|---|---|---|
| Auth | `POST /api/auth/register` | Público; validación registro; crea cuenta y wallet; no inicia sesión. |
| Auth | `POST /api/auth/login` | Público; valida credenciales y crea access/refresh. |
| Auth | `POST /api/auth/refresh` | Público con refresh válido; rota el par de tokens. |
| Auth | `POST /api/auth/logout` | Bearer; revoca refresh token del usuario autenticado. |
| Auth | `POST /api/auth/change-password` | Bearer; verifica contraseña actual, cambia hash y revoca sesiones. |
| Perfil | `GET /api/users/profile` | Bearer; consulta perfil propio. |
| Perfil | `PATCH /api/users/profile` | Bearer; cambia nombre validado. |
| Acceso a juego | `POST /api/users/games/:juego/access` | Bearer; juego en `plinko`, `blackjack`, `roulette`, `poker`; comprueba usuario y saldo. |
| Wallet | `GET /api/wallet` | Bearer; saldo, bono y total disponible propios. |
| Wallet | `GET /api/wallet/balance` | Bearer; balance e historial estadístico propios. |
| Transacciones | `POST /api/transactions/deposit` | Bearer + DTO + clave idempotente; depósito simulado, salvo rechazo de recarga simulada en producción. |
| Transacciones | `POST /api/transactions/withdraw` | Bearer + DTO + clave idempotente; retiro simulado. |
| Transacciones | `GET /api/transactions/history` | Bearer; pagina y filtra por tipo/fechas. |
| Pagos | `POST /api/payments/checkout` | Bearer + DTO + limitador propio + clave idempotente; crea sesión Stripe de prueba. |
| Pagos | `GET /api/payments/:id` | Bearer; consulta pago propio; recurso ajeno/inexistente se oculta con 404. |
| Pagos | `POST /api/payments/:id/sync` | Bearer + limitador de pagos; sincroniza estado consultando la sesión al proveedor. La transición es idempotente. |
| Pagos | `GET /api/payments/:id/sync` (deprecado) | Bearer; compatibilidad temporal. Devuelve `Deprecation: true` y `Warning`; retirar en el siguiente release autorizado. |
| Pagos | `POST /api/payments/webhook` | Webhook sin Bearer; cuerpo raw, firma Stripe verificada antes de procesar. Montado antes del parser JSON. |
| Operaciones | `GET /api/operations/:key` | Bearer; devuelve unión `PENDIENTE`, `CONFIRMADA` o `FALLIDA` por usuario y clave. El router no aplica `validateParams` ni DTO explícito al parámetro `key`. |
| Plinko | `GET /api/games/plinko/config`, `POST /bet`, `GET /rounds` | Bearer; apuesta con clave idempotente, config y rondas propias. |
| Blackjack | `POST /api/games/blackjack/start`; `GET /rounds`, `/active`, `/:id`; `POST /:id/{hit,stand,split,double,exit}` | Bearer; apuesta/acciones con DTO, acciones versionadas, idempotencia y ownership. |
| Ruleta | `GET /api/games/roulette/config`, `POST /bet`, `GET /rounds` | Bearer; apuesta con clave idempotente, configuración y rondas propias. |
| Poker | `GET /api/games/poker/config`, `/rounds`, `/active`, `/:id`; `POST /start`, `/:id/action` | Bearer; inicio/acción con clave idempotente; acción incluye versión; lecturas verifican propietario. |
| Salud | `GET /health` | Público; ejecuta consulta `SELECT 1`; devuelve estado de API/DB local y commit Render si existe. |

## Validaciones de entrada destacadas

- Registro: email válido hasta 150 caracteres, nombre entre 2 y 80, contraseña entre 8 y 72 caracteres y máximo 72 bytes UTF-8. Login: email válido y contraseña no vacía, máximo 72 bytes UTF-8. Perfil: nombre entre 2 y 80 caracteres; cambio de contraseña valida la contraseña actual y una nueva entre 8 y 72 caracteres/máximo 72 bytes UTF-8.
- Depósito simulado: monto positivo hasta 1.000.000. Retiro simulado: monto positivo hasta 500 por operación, validado también en el servidor. Ambos admiten hasta dos decimales; el método es `simulado`.
- Stripe checkout: monto entre 5 y 500 con hasta dos decimales; moneda la fija configuración de servidor y está fijada a `bob` en `env.js`. La respuesta puede ser `201` con URL o `202` con estado `CREANDO` y `Retry-After: 2`; los reintentos reutilizan la misma clave y body.
- Plinko: monto positivo con dos decimales y riesgo válido; límites actuales: PEQUENO 1–50, MEDIANO 50–500, GRANDE 500–5000.
- Blackjack: apuesta inicial 10–10.000, con el mismo límite anunciado por acceso y aplicado en frontend y backend; partida por UUID; acciones reciben versión entera no negativa.
- Ruleta: apuesta 1–1000; pleno 0–36, color rojo/negro, paridad par/impar, docena/columna 1–3.
- Poker: apuesta 1–1000; acción `check`, `raise` o `fold` y versión entera no negativa.
- Clave idempotente: entre 8 y 128 caracteres alfanuméricos, guion bajo o guion; es obligatoria en mutaciones monetarias y juegos, incluido checkout especializado.

Los límites y reglas se leen en los DTOs/configuración actuales. No todos los campos y formatos de respuesta se repiten aquí para evitar divergir del contrato versionado.

La falta de validación DTO explícita para `key` en la consulta de operaciones es una excepción observada; no se generaliza la validación de DTOs a todas las rutas.

## Errores y transporte observados

El middleware común normaliza errores de validación como 400 con detalles de campo. Auth requiere Bearer y devuelve 401 si falta/expira; propiedad de recursos se protege con consultas por usuario y 404; conflictos de estado/versión pueden responder 409; los limitadores responden 429. Stripe puede devolver 400 por firma inválida y 503 si falta configuración. El cliente central usa timeout y distingue errores de red; no reintenta mutaciones automáticamente ante resultado incierto.

## Fuentes

`backend/src/app.js`; `backend/src/modules/**/{*.routes.js,dto/*.js}`; `backend/src/middlewares/{auth.middleware.js,validation.middleware.js,operation.handler.js,rateLimit.js}`; `frontend/src/features/*/*.api.ts`; `frontend/src/shared/api/{http.ts,operations.ts}`; `openapi.json` y `backend/scripts/generate-openapi.mjs`.
