# Revisión del backend

Esta revisión conserva las rutas existentes y corrige su implementación. No modifica el frontend.

## Garantías y reglas corregidas

- Blackjack reconstruye manos, crupier y baraja desde sus campos persistidos. Cada acción bloquea la fila de la partida dentro de su transacción antes de leer su estado; dos cierres simultáneos no pueden liquidar dos veces la misma partida.
- El saldo devuelto al abrir una partida incluye el pago de un blackjack natural o la devolución de un empate.
- Se permite volver a dividir un par elegible hasta el máximo configurado de tres manos.
- Salir devuelve el 50% de cada mano activa, redondeado a dos decimales por mano. Las manos perdidas no reciben devolución; las plantadas se resuelven contra el crupier. `devuelto` expresa solo la rendición y `saldoActual` incluye todas las liquidaciones de esa operación.
- La rotación de refresh consume el token mediante una actualización condicional dentro de la transacción; solo una solicitud concurrente puede emitir su sucesor.
- Logout solo revoca un refresh perteneciente al usuario autenticado. En producción se rechaza `CORS_ORIGINS=*`; es obligatorio configurar los dominios permitidos.
- Los créditos calculan el saldo anterior a partir del saldo actualizado bajo bloqueo de PostgreSQL. Balance sin apuestas o premios devuelve agregados cero.
- La validación de query funciona con Express 5. El registro limita contraseñas a 72 bytes UTF-8, conforme al límite de bcrypt.

## Hooks de Git

Desde `backend`, ejecutar `npm run hooks:install` una vez por checkout. Configura `core.hooksPath=.githooks` únicamente para este repositorio.

- `pre-commit`: comprueba la sintaxis de los archivos JavaScript del backend incluidos en el índice, incluso cuando un archivo tiene cambios parcialmente preparados.
- `pre-push`: comprueba sintaxis y ejecuta las pruebas unitarias del backend.

Los hooks ayudan localmente; GitHub Actions ejecuta la validación independiente antes del despliegue. Los e2e necesitan una base PostgreSQL de pruebas, nunca la base de producción.

## Límites del alcance

El bloqueo de una partida evita liquidaciones duplicadas, pero no convierte las acciones en idempotentes: una solicitud repetida tras una respuesta perdida puede aplicar otra acción válida. No se añaden claves de idempotencia ni una restricción de una sola partida activa por usuario en esta revisión. Tampoco se implementan los endpoints de recuperación propuestos en los planes de integración.

Los access tokens emitidos siguen siendo válidos hasta su expiración aunque se cierre la sesión de refresh. Las operaciones de depósito y retiro siguen siendo simuladas.

## Evidencia local

Validación del 19 de octubre de 2026: `npm test` ejecutó primero 18 pruebas unitarias y después 11 escenarios HTTP e2e (12 pruebas contabilizando el contenedor de la suite), todos aprobados. Se incluyen tres pruebas del hook de despliegue: commit exacto, redacción de secretos y rechazo de una instancia saludable con versión antigua. Se usó Node 26.7.0 local y PostgreSQL 18 en el contenedor aislado `casino-backend-polish-tests`, con la migración existente aplicada y el cliente Prisma regenerado. GitHub Actions configura Node 22; su ejecución remota y el despliegue productivo requieren confirmación independiente.

Los e2e verifican registro/login, salud y autorización, balance vacío, créditos concurrentes y ledger, retiros sin sobregiro, historial, Plinko, inicio/acciones de Blackjack, cierre concurrente con pago único, tercer split, rendición, ownership de logout y refresh de un solo uso. Las pruebas no contactan proveedores externos ni modifican producción.
