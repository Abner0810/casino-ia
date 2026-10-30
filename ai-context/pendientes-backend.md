# Pendientes — Backend Casino (lo que falta para dejarlo en producción)

> Última actualización: 19 oct 2026
> Repo: https://github.com/Abner0810/casino-ia · Ramas: `dev` ✅ · `qa` ✅ · `main` ✅
> Estado del código: **completo y verificado** — `Backend checks` y `Backend integration checks` en verde en GitHub Actions (unit, integración con PostgreSQL 18 y e2e).
> Estado del deploy: **ROTO** — `https://casino-ia-9llp.onrender.com/health` responde **503** (19 oct 2026). Los runs #2 y #3 de `Deploy backend to Render` fallaron por timeout de 25 min esperando salud; la causa está en la sección 1 (DB y variables sin configurar en Render).

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

> Flujo real vigente: workflow **`Deploy backend to Render`** (`deploy.yml`), documentado en
> [`backend/DEPLOY.md`](../backend/DEPLOY.md). Usa el **deploy hook** de Render;
> **no** usa `RENDER_API_KEY` ni `RENDER_SERVICE_ID`.

- [x] Secret `RENDER_DEPLOY_HOOK_URL` configurado en GitHub (`Settings → Secrets and variables → Actions`)
      — probado: los runs #2 y #3 llegaron hasta la espera de `/health`, lo que solo ocurre
      si el secret es válido. La URL del hook contiene una clave: tratarla como credencial.
- [ ] Verificar: hacer push a `main` (o ejecución manual desde Actions sobre `dev`, `main`
      o `backend/polish-render`) → workflow **Deploy backend to Render** → job `test` en verde
      → job `deploy` invoca el hook con `ref` = SHA completo validado y espera hasta 25 minutos
      a que `/health` devuelva `status: ok`, `db: up` y `commit` igual al SHA.
      **Estado 19 oct 2026: runs #2 y #3 fallaron por timeout** — el hook se aceptó pero el
      servicio nunca quedó sano (falta completar la sección 1).
- [ ] Mantener `autoDeployTrigger: off` en `render.yaml` (así está): el Blueprint y el hook
      por SHA impiden despliegues que se salten el gate de CI. No activar el auto-deploy
      nativo de Render ni usar una segunda vía.

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
- [ ] `POST /api/auth/change-password` → 200 y la contraseña anterior deja de servir; con contraseña actual incorrecta → **401**
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

- [x] **Frontend React** implementado en `frontend/` y publicado en **Firebase Hosting**
      (https://casino-ia-4e7b6.web.app; publicación manual 19 oct 2026 — el workflow de
      Actions `Firebase Hosting` aún no tiene ejecuciones; ver `pendientes-frontend.md`)
- [ ] Completar `CORS_ORIGINS` en Render con el dominio real de Firebase

---

## ✅ Ya completado (referencia)

- Código de los 6 módulos (auth, users, wallet, transactions, plinko, blackjack) con arquitectura por capas
- Prisma schema + migración inicial (`0_init`), Decimals en todo el dinero, ledger `Movimiento`
- Seguridad: bcrypt 12, Argon2id one-time (anti-IDOR), JWT 30min + refresh 7d rotado, rate-limits, helmet, CORS whitelist, env validada con Zod
- Tests: 10 de lógica (Plinko/Blackjack) + 7 smoke HTTP → todos en verde
- `render.yaml`, GitHub Actions (`ci.yml` en dev/qa · `deploy.yml` en main), 3 ramas empujadas
- `npm audit`: 0 vulnerabilidades

## Mapa de conocimiento

[[cerebro/Inicio|Casino IA · Segundo cerebro]] · [[cerebro/Guia del grafo|Guía del grafo de Obsidian]]
