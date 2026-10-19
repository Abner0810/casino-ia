# Revisión del backend

Esta revisión del backend integra el contrato existente de la rama dev y corrige su implementación. Los cambios propios de esta revisión no modifican el frontend.

## Garantías y reglas corregidas

- Blackjack reconstruye manos, crupier y baraja desde sus campos persistidos. Cada acción bloquea la fila de la partida dentro de su transacción antes de leer su estado; dos cierres simultáneos no pueden liquidar dos veces la misma partida.
- El saldo devuelto al abrir una partida incluye el pago de un blackjack natural o la devolución de un empate.
- Se permite volver a dividir un par elegible hasta el máximo configurado de tres manos.
- Salir conserva la regla del simulador de dev: cancela toda la mesa y devuelve el 50% de la apuesta total, redondeado una sola vez. Todas las manos quedan `RENDIDA`; la distribución de centavos entre manos suma exactamente `devuelto`.
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

Las mutaciones monetarias y de juegos requieren `Idempotency-Key`. Repetir la misma solicitud con la misma clave recupera la respuesta persistida; reutilizarla con otro contenido devuelve 409. Las acciones Blackjack requieren la versión de partida y rechazan versiones anteriores con 409. Se conserva la restricción de una partida activa por usuario y los endpoints de consulta de partida activa, partida individual y operación persistida introducidos en dev.

Los access tokens emitidos siguen siendo válidos hasta su expiración aunque se cierre la sesión de refresh. Las operaciones de depósito y retiro siguen siendo simuladas.

## Evidencia local

Validación posterior a integrar dev del 19 de octubre de 2026: `npm test` terminó con código 0 y ejecutó, en orden, 19 pruebas unitarias y de contrato, 19 escenarios de integración (20 pruebas contando su suite) y 11 escenarios HTTP e2e (12 pruebas contando su suite). Se incluyen tres pruebas del hook de despliegue: commit exacto, redacción de secretos y rechazo de una instancia saludable con versión antigua. Se ejecutó Node 22 en Docker con dependencias Linux, montando el código actual de solo lectura. La base fue PostgreSQL 18 en el contenedor aislado `casino-backend-polish-tests`; se regeneró Prisma y se aplicaron las dos migraciones antes de ejecutar las pruebas. GitHub Actions también configura Node 22; su ejecución remota y el despliegue productivo requieren evidencia independiente.

Los e2e verifican registro/login, salud y autorización, balance vacío, créditos concurrentes y ledger, retiros sin sobregiro, historial, Plinko, inicio/acciones de Blackjack, cierre concurrente con pago único, tercer split, rendición, ownership de logout y refresh de un solo uso. Las pruebas no contactan proveedores externos ni modifican producción.
