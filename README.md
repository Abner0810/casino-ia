# 🎰 Casino API — Simulador Plinko + Blackjack
hola
El repositorio incluye ahora la SPA en [`frontend/`](frontend/README.md),
con Firebase Hosting, CI/CD y agentes especializados para Codex/OpenCode.
Consulta la [comparación con dev y pendientes reales](ai-context/comparacion-frontend.md)
y la [guía de agentes y hooks](docs/agentes.md).

API REST de un simulador de casino con dos juegos: **Plinko** (apuestas pequeñas, medianas y grandes) y **Blackjack** (split, doblar apuesta, rendición).

## Stack

- **Node.js 22+ / Express 5** — API REST por capas
- **PostgreSQL 18 + Prisma 6** — datos y ORM (patrón repository)
- **Zod** — validación de DTOs y variables de entorno
- **JWT** (access 30min + refresh 7d con rotación) — autenticación
- **bcrypt** (costo 12) — contraseñas
- **Argon2id** (hash one-time) — IDs públicos anti-IDOR

## Arquitectura

```
Ruta → auth → authZ → validate(dto Zod) → controller → service → repository → Prisma → PostgreSQL
```

- **Middleware**: token, permisos, formato (DTO), rate-limit.
- **Service**: reglas de negocio (saldo, estados de partida).
- **Repository**: única capa que toca Prisma.
- El dinero solo se muta dentro de una `$transaction` que además crea su fila en el **ledger `Movimiento`** (atomicidad saldo + historial).

## Módulos y rutas

| Módulo | Ruta base | Endpoints |
|---|---|---|
| auth | `/api/auth` | `POST /register` `POST /login` `POST /refresh` `POST /logout` |
| usuarios | `/api/users` | `GET /profile` `PATCH /profile` `POST /games/:juego/access` |
| billetera | `/api/wallet` | `GET /` (saldo) `GET /balance` (consolidado) |
| transacciones | `/api/transactions` | `POST /deposit` `POST /withdraw` `GET /history` |
| plinko | `/api/games/plinko` | `POST /bet` `GET /rounds` |
| blackjack | `/api/games/blackjack` | `POST /start` `/:id/hit` `/:id/stand` `/:id/split` `/:id/double` `/:id/exit` `GET /rounds` |
| salud | `/health` | `GET` (health check de Render, verifica DB) |

## Correr localmente

```bash
cd backend
cp .env.example .env      # completa tus variables
npm install
npx prisma migrate dev    # aplica la migración (necesita una DB local)
npm run dev
```

Sin DB local puedes verificar la estructura igual:

```bash
npm run test:logic        # tests de motores puros (Plinko/Blackjack)
node tests/smoke.http.mjs # smoke test de la API sin DB
```

## Flujo de ramas y despliegue automático

```
dev  ──push──▶  CI tests automáticos (GitHub Actions)
 │
 ├──▶ qa  ──push──▶  CI tests + prueba manual de tus amigos
 │
 └──▶ main (merge cuando qa apruebe)  ──push──▶  CI tests ──▶ DEPLOY AUTOMÁTICO a Render
```

| Rama | Qué pasa al hacer push |
|---|---|
| `dev` | `.github/workflows/ci.yml` corre los tests; si fallan, la rama queda marcada en rojo |
| `qa` | Los mismos tests + pruebas manuales de QA de tus amigos |
| `main` | Tests primero (gate) y **si pasan**, `deploy.yml` dispara el deploy en Render vía su API |

El workflow usa el secreto existente `RENDER_DEPLOY_HOOK_URL`. Despliega el SHA validado con `ref` y espera que `/health` confirme ese mismo commit en Render. Consulta [backend/DEPLOY.md](backend/DEPLOY.md).

## Deploy en Render

El backend usa el gate de GitHub Actions: unit tests primero y E2E con PostgreSQL 18 despues. Render mantiene Auto Deploy en Off. El workflow permite push a `main` o ejecucion manual desde Actions sobre `main` o `backend/polish-render` y verifica el commit y `/health` antes de finalizar.

La configuracion, secretos y alternativa manual estan en [backend/DEPLOY.md](backend/DEPLOY.md). El build usa `npm ci && npm run build && npm run migrate:deploy`, Node 22 y `backend` como directorio raiz.

## Seguridad implementada

- Contraseñas bcrypt costo 12; mensaje de login idéntico exista o no el email.
- IDs internos (UUID) nunca expuestos: el cliente solo ve `publicId` (hash Argon2id calculado una única vez en el registro).
- Recursos propios derivados del token, nunca de la URL (anti-IDOR por diseño).
- Refresh token opaco con hash SHA-256 en DB, rotación en cada uso y revocación en logout.
- Rate-limit: general 100/min, `/auth` 10/min, apuestas 30/min.
- Helmet + CORS restringido al dominio de Firebase.
- Plinko: RNG server-side con semilla de 32 bytes registrada por ronda (auditable/reproducible).
- Blackjack: estado completo server-side en JSONB; el cliente nunca ve la carta oculta del crupier ni influye en el mazo.
