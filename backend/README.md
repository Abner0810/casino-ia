# Backend del simulador

Implementación local para créditos simulados; no procesa pagos reales. El contrato generado está en [openapi.json](./openapi.json). Su fuente editable es `scripts/generate-openapi.mjs`; ejecutar `npm run contract:generate` y verificar antes de integrar clientes.

## Integración frontend

- Access Bearer de 30 minutos y refresh opaco de 7 días, ambos en JSON. El cliente inicial mantiene tokens en memoria; recargar requiere login y luego `GET /api/games/blackjack/active` recupera la mesa.
- Depósito, retiro y todas las apuestas y acciones de los cuatro juegos requieren `Idempotency-Key`: 8–128 caracteres alfanuméricos, guion o guion bajo. Usar una clave nueva por intención y conservarla ante timeout. Repetir misma clave, ruta y body devuelve la respuesta original, incluso tras terminar una partida. Otro payload devuelve 409.
- Las acciones de Blackjack y Poker reciben `{version}` de la última respuesta. Dos acciones simultáneas con esa versión no pueden avanzar ambas. Ante `409 STALE_VERSION`, consultar estado antes de enviar una nueva intención.
- `GET /api/operations/:key` recupera la respuesta confirmada propia. Un 404 no demuestra ausencia de commit: puede haber otra solicitud aún en curso. Reenviar la misma clave es seguro; no cambiarla para un reintento. No hay purga automática de claves; el registro y respuesta se conservan mientras exista la cuenta.
- La respuesta idempotente contiene el saldo y versión del momento original. Reconsultar wallet/partida para estado actual si hubo operaciones posteriores. El header `Idempotency-Replayed` identifica recuperaciones.
- `GET /api/games/plinko/config` entrega la tabla real por slot, nueve filas y diez slots, incluso con saldo cero. Animar `ruta` del resultado; nunca elegir el resultado en el cliente.
- Ruleta europea: `GET /api/games/roulette/config`, `POST /bet` con `{apuesta,tipo,seleccion}` y `GET /rounds`. `tipo` admite `pleno` (0–36), `color` (`rojo`/`negro`), `paridad` (`par`/`impar`), `docena` y `columna` (1–3). El servidor sortea 0–36 con CSPRNG; cero solo gana en pleno. `ganancia` es retorno bruto y `gananciaNeta` descuenta la apuesta.
- Poker Texas Hold'em: `POST /api/games/poker/start` cobra la apuesta y reparte dos cartas privadas; `POST /:id/action` recibe `{version,accion}` (`check`, `raise` o `fold`) y avanza preflop, flop, turn y river. `/active` y `/:id` recuperan la partida propia; `/rounds` muestra el historial y `/config` las reglas. Una sola partida activa por usuario. El mazo restante nunca sale de la base de datos.
- Dinero JSON numérico y cálculos internos Decimal con redondeo HALF_UP a dos decimales. Depósitos/retiros solo aceptan `metodo: "simulado"` (por defecto). Saldo máximo 9.999.999.999,99; desbordar rechaza toda la transacción. Bono es separado y no se utiliza para apostar ni retirar.
- Historial usa `pagina`, `porPagina`, `tipo`, `desde`, `hasta`. Fechas ISO con zona, extremos inclusivos y desde <= hasta. El orden es fecha descendente con desempate por ID; no garantiza snapshot entre páginas.
- Errores incluyen `error`, `codigo`, `requestId` y opcionalmente `detalles`. Ante 429 respetar `Retry-After`; ante red/5xx reconciliar por la clave. CORS permite el header de idempotencia y expone los headers de recuperación y correlación.

## Reglas Blackjack

Una sola partida activa por usuario, respaldada por índice único parcial. `/active` devuelve `{partida: null}` si no existe; `/:id` entrega solo una partida propia. Las consultas y acciones usan el mismo resumen con saldo, versión, mano activa y acciones disponibles. Carta oculta `🂠` y `resultado: null` mientras la mesa esté activa. No se publica la baraja.

Crupier planta en 17; natural retorna 2,5 veces la apuesta, victoria normal 2 y empate 1. Split por valor hasta tres manos; se admite doble tras split. Ases divididos reciben una carta y se plantan. El estado general GANADA indica que al menos una mano ganó, no necesariamente que el neto total sea positivo; sumar retornos de manos menos apuestaTotal.

Rendición es una regla particular del simulador: devuelve 50% de la apuesta total de toda la mesa, incluidas manos ya perdidas o plantadas mientras siga activa. Todas se registran RENDIDA y sus devoluciones suman exactamente el crédito, repartiendo el redondeo residual en la última mano. Cerrar pestaña o navegar fuera no rinde ni liquida automáticamente.

## Sesiones y seguridad

Solo una rotación concurrente de un refresh prospera. Un intento repetido recibe 401 y no revoca automáticamente el sucesor legítimo. Logout requiere access vigente y solo revoca refresh propio; no invalida inmediatamente el JWT access existente. Varias sesiones independientes siguen permitidas. No hay cookie de sesión ni promesa de persistencia tras recarga.

La protección de recursos se basa en ownership autenticado; los IDs públicos no sustituyen autorización y el payload JWT es legible. Producción requiere CORS con orígenes explícitos. Logs de petición incluyen correlación, duración y estado, sin bodies, claves, tokens o contraseñas. Rate limiting actual es por proceso, no distribuido entre réplicas.

## Pruebas reproducibles

### Docker: backend y PostgreSQL juntos

Requiere Docker Engine con Compose v2 (Docker Desktop en Windows) y Node para el script inicial. Desde `backend/`:

```powershell
npm run docker:setup
npm run docker:up
```

`docker:setup` crea `.env` local con secretos aleatorios y nunca sobrescribe uno existente. Si ya tienes `.env`, añade las variables de [docker/.env.example](./docker/.env.example), conservando tus valores existentes. La contraseña PostgreSQL debe ser URL-safe (usar hexadecimal); usuario y DB, identificadores simples. Para trabajar exclusivamente con Docker también puedes preparar `.env` manualmente y ejecutar `docker compose up --build -d --wait` sin instalar Node en el host.

API: `http://localhost:3000`; salud: `http://localhost:3000/health`. Cambiar `API_PORT` si está ocupado. El futuro frontend usa `http://localhost:3000/api`; ajustar `CORS_ORIGINS` al origen real del navegador. DATABASE_URL/DIRECT_URL se construyen dentro de Compose usando el host interno `postgres`, independiente de las URLs para ejecución nativa.

El arranque espera a que PostgreSQL esté sano, ejecuta las migraciones en un contenedor separado y solo después inicia la API. Si la migración falla, la API no arranca. La imagen final usa Node 22, dependencias de producción y usuario sin privilegios; API con filesystem de solo lectura, `/tmp` temporal, healthcheck, señales de apagado y logs con rotación. PostgreSQL solo es accesible por la red interna de Compose; sus datos viven en un volumen persistente. El montaje `/var/lib/postgresql` sigue la [configuración oficial para PostgreSQL 18](https://hub.docker.com/_/postgres).

```powershell
npm run docker:logs
docker compose ps -a
npm run docker:down
```

`down` conserva el volumen y los datos. **No usar `down -v` salvo que quieras borrar la DB local.** Cambiar POSTGRES_PASSWORD en `.env` no cambia automáticamente la contraseña de un volumen ya inicializado; coordinar el cambio en PostgreSQL o usar una base nueva. No copiar `.env` al repositorio ni a imágenes: `.dockerignore` excluye secretos y node_modules del host.

Para desarrollo con recarga de código:

```powershell
npm run docker:dev
```

Monta únicamente `src/` en modo lectura y usa `node --watch`. Cambios en dependencias, schema o migraciones requieren reconstruir con el mismo comando. Para volver a la imagen de producción, ejecutar `npm run docker:up`. No aplicar migraciones desde el contenedor final: usar el servicio `migrate` o el arranque normal de Compose.

Para ejecutar todas las pruebas dentro de Docker, en un proyecto y DB separados:

```powershell
npm run docker:test
docker compose -f compose.test.yaml down
```

El runner efímero ejecuta `verify`: validación Prisma, migraciones, contrato, lógica, smoke e integración. No usa los datos del stack normal. El puerto 55439 se mantiene para pruebas nativas; debe estar libre. La configuración Docker local no publica TLS ni despliega servicios externos: para hosting futuro, usar secretos del proveedor, HTTPS en el ingreso, respaldo de DB y migraciones antes de promover la imagen.

### Pruebas desde Node en el host

```powershell
npm ci
docker compose -f compose.test.yaml up -d --wait
$env:INTEGRATION_DATABASE_URL='postgresql://casino_test:casino_test@localhost:55439/casino_test'
npm run verify
docker compose -f compose.test.yaml down
```

El puerto es solo localhost. Si está ocupado por otra base de pruebas, usar otro puerto y URL. `verify` valida/genera Prisma, aplica migraciones y ejecuta contrato, lógica, smoke e integración. Exige una URL explícita con `test` en el nombre de DB. Solo limpia cuentas generadas por cada prueba; no trunca tablas. Usar siempre una DB dedicada y desechable, nunca producción. Para CI, provisionar PostgreSQL 18 y ejecutar el mismo comando con la URL de ese servicio. Los workflows en la raíz no se modificaron por el alcance exclusivo de backend; todavía deben conectarse a `npm run verify` para que integración sea un gate remoto.

## Migración y despliegue posterior

Aplicar `npm run migrate:deploy` antes de arrancar la nueva versión. La migración falla deliberadamente si hay más de una partida activa por usuario, saldos negativos, movimientos inválidos o refresh hashes duplicados: resolver datos con revisión y respaldo, sin borrado automático. Añade versión de partida, unicidad de activa, operaciones idempotentes, vínculo de ledger e índices de refresh. Las operaciones anteriores quedan con operationId null.

Configurar DATABASE_URL, DIRECT_URL, secretos de access y CORS_ORIGINS con dominios reales de desarrollo/QA/Firebase. JWT_REFRESH_SECRET se conserva como variable requerida por compatibilidad, aunque el refresh actual es opaco y no se firma con ella. No publicar secretos ni tokens.

El código anterior a estos cambios no respeta los nuevos locks/versiones: detener escrituras de instancias antiguas durante promoción o rollback. Tener un backup y probar migración en copia antes de producción. No revertir schema ni borrar operaciones para volver a una versión incompatible. No se aplicaron migraciones a servicios remotos ni se desplegó esta implementación.

## Evidencia local — 19 oct 2026

Verificación completa ejecutada con Node 22 contra PostgreSQL 18 temporal en localhost: ambas migraciones aplicadas desde una base vacía; nueva ejecución sin migraciones pendientes; 11 pruebas de lógica/contrato y 19 escenarios de integración aprobados (el runner cuenta además el test padre). Smoke: siete comprobaciones de middleware aprobadas y health 200 con DB disponible. Incluye recorrido HTTP con registro, login, edición de perfil, depósito, Plinko, Blackjack, historial, retiro, refresh y logout, además de concurrencia, rollback, ownership, saldo máximo y recuperación idempotente. OpenAPI validado y `git diff --check -- backend` sin errores.

Esto verifica el backend local con persistencia real. No comprueba despliegue remoto, un navegador Firebase ni el gate de integración del workflow raíz.

Docker verificado también: construcción Linux de ambas etapas, arranque con migración inicial, health 200 en modo normal y desarrollo, usuario UID 1000 y ausencia de `.env` dentro de la imagen. El runner Docker aprobó las 11 pruebas de lógica/contrato, smoke y los 19 escenarios de integración. Recrear el stack conservando el volumen mantiene las migraciones aplicadas. El entorno de pruebas se apagó al terminar.

## Mapa de conocimiento

[[cerebro/Inicio|Casino IA · Segundo cerebro]] · [[cerebro/Guia del grafo|Guía del grafo de Obsidian]]
