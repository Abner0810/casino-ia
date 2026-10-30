# Modelo de datos as-built

Este documento resume el esquema local de Prisma, no propone migraciones. Fuente: [schema.prisma](../../backend/prisma/schema.prisma).

## Entidades

| Entidad | Campos/relaciones observados | Uso en el producto |
|---|---|---|
| `User` | ID interno UUID, `publicId`, email único, hash de contraseña, nombre, rol (`JUGADOR`/`ADMIN`), fecha de creación. Relación uno-a-uno opcional con Wallet; relaciones con movimientos, partidas, rondas, refresh tokens, operaciones y pagos. | Identidad autenticada y propiedad de los recursos. El ID interno no se expone al cliente. |
| `Wallet` | `userId` único, saldo y bono `Decimal(12,2)`, fecha de actualización. | Saldo de simulación y bono separados. |
| `Movimiento` | Usuario, tipo (`DEPOSITO`, `RETIRO`, `APUESTA`, `PREMIO`), monto, saldo antes/después, juego opcional, descripción, operación/pago opcionales, fecha. Índice por usuario y fecha. | Libro de cambios monetarios consultable como historial. |
| `Operation` | Usuario, clave, huella de solicitud, operación, HTTP status, respuesta JSON, fecha; unicidad compuesta usuario+clave. | Repetición idempotente de respuesta para operaciones que pasan por middleware. |
| `Pago` | Usuario, monto Decimal, moneda, estado (`PENDIENTE`, `PAGADO`, `FALLIDO`, `EXPIRADO`), sesión Stripe única, payment intent opcional y movimiento opcional. | Estado persistido de una sesión de checkout de prueba y vínculo con crédito confirmado. |
| `RefreshToken` | Usuario, hash SHA-256 único, expiración, revocación y creación. | Rotación y revocación de refresh token. |
| `RondaPlinko` | Usuario, apuesta, riesgo, multiplicador, ganancia, semilla, ruta JSON y fecha. | Resultado de una apuesta instantánea Plinko. |
| `RondaRuleta` | Usuario, apuesta, tipo, selección, número, multiplicador, ganancia y fecha. | Resultado de una apuesta de ruleta. |
| `PartidaBlackjack` | Usuario, apuesta, estado, zapato/dealer/manos JSON, resultado JSON, fecha de inicio/cierre y versión. | Estado durable de mesa y control de versión. |
| `PartidaPoker` | Usuario, apuesta inicial/total, estado, modalidad, fase, cartas privadas/comunitarias/mazo JSON, resultado, ganancia, versión y fechas. | Mano Texas Hold’em guardada y recuperable; el campo modalidad conserva valor por defecto legado `VIDEO_POKER`. |

## Relaciones e invariantes observados

- Wallet y Usuario se relacionan mediante `userId` único; el registro crea la billetera en el servicio de autenticación.
- Movimiento, Pago, Operation y resultados de juego se relacionan con el usuario propietario.
- Las cifras monetarias persistidas son decimales con dos decimales y `ledger.js` actualiza saldo y crea movimiento dentro de la transacción del servicio.
- El movimiento puede apuntar a operación y pago; `pagoId` es único en Movimiento, lo que ayuda a impedir doble acreditación del mismo pago.
- Blackjack y Poker guardan estado variable como JSON y un entero de versión para detectar acciones antiguas/concurrentes.
- No hay modelos `Tenant`, `TenantMembership`, Outbox o Inbox en el esquema revisado. Las notas que los muestran pertenecen a una arquitectura objetivo.

## Límites de este resumen

La existencia de modelos y restricciones en schema.prisma no demuestra que todas las migraciones estén aplicadas en una base remota. Tampoco demuestra integridad operacional más allá de las rutas, servicios y pruebas inspeccionados.
