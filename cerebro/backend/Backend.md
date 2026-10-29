---
tags: [backend]
---
# 🟢 Backend

API Express organizada en rutas, middlewares, controladores, servicios y repositorios. Prisma conecta con PostgreSQL; el servidor decide los resultados y el saldo.

| Área | Ruta base | Nota |
| --- | --- | --- |
| Auth y perfil | `/api/auth`, `/api/users` | [[cerebro/seguridad/Seguridad y sesion|Seguridad y sesión]] |
| Economía | `/api/wallet`, `/api/transactions` | [[cerebro/economia/Billetera y ledger|Billetera y ledger]] |
| Pagos | `/api/payments` | [[cerebro/economia/Pagos Stripe|Pagos Stripe]] |
| Juegos | `/api/games/*` | [[cerebro/juegos/Juegos|Juegos]] |
| Operaciones | `/api/operations` | [[cerebro/arquitectura/Contratos y operaciones|Contratos y operaciones]] |
| Salud | `/health` | [[cerebro/operacion/Calidad y despliegue|Despliegue]] |

Fuentes: `backend/src/modules/`, [[backend/README]], [[backend/HARDENING]]. Para la estructura persistida, consultar [[cerebro/arquitectura/Datos|Datos]].

## Evolución arquitectónica

[[cerebro/backend/Microservicios|Mapa de servicios objetivo]] · [[cerebro/arquitectura/Estado actual|Monolito actual]] · [[cerebro/datos/Modelo relacional objetivo|Datos por propietario]]
