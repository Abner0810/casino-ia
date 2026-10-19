# Pendientes — Backend Casino (lo que falta para dejarlo en producción)

> Última actualización: 18 oct 2026
> Repo: https://github.com/Abner0810/casino-ia · Ramas: `dev` ✅ · `qa` ✅ · `main` ✅
> Estado del código: **completo y verificado** (10 tests de lógica + 7 smoke tests en verde, CI pasando en GitHub Actions)

---

## 1. 🔴 Obligatorio — Configurar Render (deploy real)

### 1.1 Base de datos PostgreSQL 18
- [ ] En Render: **New + → PostgreSQL** → instancia **Free** → versión **18**
- [ ] Copiar las **dos** URLs desde el botón *Connections* del pool de la DB:
  - `DATABASE_URL` (la usa la app, pasa por el pooler de Render)
  - `DIRECT_URL` (conexión directa, la necesita `prisma migrate deploy`)

### 1.2 Servicio Web (la API)
- [ ] Si no existe un servicio apuntando al repo: crearlo o reconectar el existente
      (*Settings → Source → Connect a repository* → `Abner0810/casino-ia`)
- [ ] Render detecta el `render.yaml` de la raíz → aplicarlo (build/start/health ya están escritos ahí)
- [ ] Verificar primer deploy en verde → abrir `https://<servicio>.onrender.com/health`
      → debe responder `{"status":"ok","db":"up"}`

### 1.3 Variables de entorno en el servicio (Render → Environment)
- [ ] `DATABASE_URL` = *(la de Render)*
- [ ] `DIRECT_URL` = *(la de Render)*
- [ ] `JWT_ACCESS_SECRET` = *(generar: `openssl rand -hex 32`, mínimo 32 chars)*
- [ ] `JWT_REFRESH_SECRET` = *(generar otro distinto)*
- [ ] `CORS_ORIGINS` = `https://<tu-proyecto>.web.app` *(dominio de Firebase, se completa al hacer el frontend)*
- [ ] *(Render inyecta `PORT` y `NODE_ENV` solo, no hace falta tocarlos)*

> ⚠️ El `.env` local NUNCA se sube al repo (está en `.gitignore`); los valores reales solo viven en el dashboard de Render.

---

## 2. 🔴 Obligatorio — Deploy automático desde GitHub Actions

- [ ] En GitHub → `Settings → Secrets and variables → Actions → New repository secret`:

| Secret | De dónde sale |
|---|---|
| `RENDER_API_KEY` | Render → **Account Settings → API Keys → Create API Key** |
| `RENDER_SERVICE_ID` | ID del servicio en su página (`svc-xxxxxxxx...`) |

- [ ] Verificar: hacer push a `main` → workflow **Deploy a Producción (Render)** →
      job `test` en verde → job `deploy` dispara el deploy en Render
- [ ] *Alternativa (si la API key no funciona en plan gratis)*: activar el
      auto-deploy nativo de Render (*Service → Settings → Build & Deploy →
      Auto Deploy: push to `main`*). Usar **una sola de las dos vías**, no ambas.

**Recordatorio del flujo de ramas acordado:**
```
dev  → push = tests automáticos (CI)
qa   → push = tests + pruebas manuales de tus amigos
main → push = tests (gate) → DEPLOY AUTOMÁTICO a Render
```

---

## 3. 🟡 Verificación end-to-end (cuando haya DB real)

Ejecutar contra la URL de Render con la DB conectada:

- [ ] `POST /api/auth/register` → crea usuario + wallet(0) + `publicId` argon2
- [ ] `POST /api/auth/login` → devuelve access (30min) + refresh
- [ ] `POST /api/auth/refresh` → rota ambos tokens; el refresh viejo deja de servir
- [ ] `POST /api/auth/logout` → revoca el refresh
- [ ] `POST /api/transactions/deposit` → saldo sube **y** aparece el movimiento DEPOSITO en `GET /api/transactions/history`
- [ ] `POST /api/transactions/withdraw` con monto > saldo → **400** y ni el saldo ni el ledger cambian
- [ ] `POST /api/users/games/plinko/access` → devuelve los 3 rangos de riesgo
- [ ] `POST /api/games/plinko/bet` en cada riesgo → premio acreditado, ronda con seed registrada
- [ ] Partida de blackjack completa: `start` → `hit` → `stand` → crupier juega → premio/ledger correcto
- [ ] `split` con par (y rechazo si no es par) · `double` (y rechazo con >2 cartas) · `exit` devuelve 50%
- [ ] Prueba anti-IDOR: con el token de un usuario A intentar usar una partida del usuario B → **404**
- [ ] `GET /health` responde `{"status":"ok","db":"up"}`
- [ ] CORS: probar una petición desde el dominio de Firebase (cuando exista) y una desde otro dominio (debe bloquear)

---

## 4. 🟢 Opcional / mejoras futuras

- [ ] **Refresh tokens huérfanos**: agregar un job/cron que borre `RefreshToken` con `expiresAt` viejo (limpieza; ahora solo se ignoran en las queries)
- [ ] **Seed de datos de prueba** (`prisma/seed.js`): usuario demo con saldo para pruebas de QA de tus amigos
- [ ] **Tests de integración con DB** (actualmente los tests son de lógica pura y smoke sin DB — por no tener PostgreSQL local)
- [ ] **Logging estructurado** (pino) en lugar de `console.log` para producción
- [ ] **Sentry o similar** para captura de errores en producción
- [ ] Si en el futuro se quiere espectar partidas o multi-jugador: evaluar SSE/WebSocket (no necesario hoy)

---

## 5. 📦 Siguiente gran fase (fuera del backend)

- [ ] **Frontend React** → deploy en **Firebase Hosting**, apuntando a la API de Render
      (login/registro, billetera, recargas/retiros, tablero Plinko, mesa Blackjack interactiva)
- [ ] Completar `CORS_ORIGINS` en Render con el dominio real de Firebase

---

## ✅ Ya completado (referencia)

- Código de los 6 módulos (auth, users, wallet, transactions, plinko, blackjack) con arquitectura por capas
- Prisma schema + migración inicial (`0_init`), Decimals en todo el dinero, ledger `Movimiento`
- Seguridad: bcrypt 12, Argon2id one-time (anti-IDOR), JWT 30min + refresh 7d rotado, rate-limits, helmet, CORS whitelist, env validada con Zod
- Tests: 10 de lógica (Plinko/Blackjack) + 7 smoke HTTP → todos en verde
- `render.yaml`, GitHub Actions (`ci.yml` en dev/qa · `deploy.yml` en main), 3 ramas empujadas
- `npm audit`: 0 vulnerabilidades
