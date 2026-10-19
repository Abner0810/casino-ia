# PLAN FINAL — Backend Simulador Casino (Plinko + Blackjack)

## 1. Stack tecnológico

| Componente | Tecnología | Versión/Detalle |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Framework | Express | 5 |
| ORM | Prisma | 6 |
| DB | PostgreSQL | 18 (Render Managed) |
| Validación | Zod | DTOs + env |
| Auth | JWT | Access 30min + Refresh 7d |
| Passwords | bcrypt | Costo 12 |
| IDs públicos | Argon2id | Hash one-time |
| Seguridad | helmet, cors, express-rate-limit | CORS restringido al dominio Firebase |

## 2. Arquitectura por capas (flujo de una petición)

```
Ruta (routes)
  → auth.middleware        ¿Tiene access token válido? (30 min)
  → authZ.middleware        ¿Tiene permiso / es su recurso? (compara contra req.user)
  → validate(dto)           ¿Body/params/query cumplen el schema Zod?
  → controller              Orquesta: recibe req, llama al service, formatea respuesta
  → service                 Reglas de negocio: saldo alcanza, estado de partida válida
  → repository              Único lugar que toca Prisma
  → Prisma → PostgreSQL 18
```

Reglas de distribución:
- **Middleware**: validaciones transversales reutilizables (token, permisos, formato).
- **Service**: validaciones de negocio que dependen de la DB (saldo, estados de juego).
- **Controller delgado**: nunca valida ni decide, solo orquesta.
- **Repository**: solo queries, cero lógica.

## 3. Estructura de carpetas

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   │   ├── env.js                  # valida process.env con Zod al arrancar
│   │   └── cors.js                 # whitelist dominio Firebase
│   ├── middlewares/
│   │   ├── auth.middleware.js      # verifica JWT → req.user
│   │   ├── authz.middleware.js     # rol y ownership
│   │   ├── validation.middleware.js# validateBody/Params/Query genéricos con Zod
│   │   ├── rateLimit.js            # general + estricto (auth, apuestas)
│   │   └── error.handler.js        # catch global → {error, message}
│   ├── shared/
│   │   ├── prisma.client.js        # instancia singleton
│   │   ├── ApiError.js
│   │   └── utils/                  # money.js (Decimal), cards.js (mazo), ledger.js
│   ├── modules/
│   │   ├── auth/        routes · controller · service · repository · dto
│   │   ├── users/       routes · controller · service · repository · dto
│   │   ├── wallet/      routes · controller · service · repository
│   │   ├── transactions/ routes · controller · service · repository · dto
│   │   └── games/
│   │       ├── plinko/     routes · controller · service · repository · dto
│   │       └── blackjack/  routes · controller · service · repository · dto
│   ├── app.js           # monta rutas /api/*, helmet, cors, error handler
│   └── server.js        # valida env, conecta DB, escucha PORT
```

## 4. Modelo de datos (Prisma → PostgreSQL 18)

```prisma
model User {
  id            String    @id @default(uuid())      // INTERNAL - nunca se expone
  publicId      String    @unique                    // Argon2id(internalId) - expuesto
  email         String    @unique
  passwordHash  String                               // bcrypt costo 12
  nombre        String
  rol           Rol       @default(JUGADOR)          // JUGADOR | ADMIN
  wallet        Wallet?
  movimientos   Movimiento[]
  partidas      PartidaBlackjack[]
  rondasPlinko  RondaPlinko[]
  refreshToken  RefreshToken?
  createdAt     DateTime  @default(now())
}

model Wallet {
  id        String  @id @default(uuid())
  userId    String  @unique
  saldo     Decimal @db.Decimal(12,2)   // dinero real
  bono      Decimal @default(0) @db.Decimal(12,2)
  updatedAt DateTime @updatedAt
}

// LEDGER inmutable - fuente única de verdad del dinero
model Movimiento {
  id           String          @id @default(uuid())
  userId       String
  tipo         TipoMovimiento  // DEPOSITO | RETIRO | APUESTA | PREMIO
  monto        Decimal         @db.Decimal(12,2)  // siempre positivo
  saldoAntes   Decimal         @db.Decimal(12,2)
  saldoDespues Decimal         @db.Decimal(12,2)
  juego        String?         // "plinko" | "blackjack" | null
  descripcion  String
  createdAt    DateTime        @default(now())
  @@index([userId, createdAt])
}

model PartidaBlackjack {
  id         String    @id @default(uuid())
  userId     String
  apuesta    Decimal   @db.Decimal(12,2)
  estado     Estado    @default(ACTIVA)  // ACTIVA | GANADA | PERDIDA | EMPATE | RENDIDA
  baraja     Json                     // shoe de 6 mazos restante
  dealer     Json                     // mano del crupier
  manos      Json                     // [{cartas, valor, apuesta, estado}] — soporta split
  resultado  Json?
  createdAt  DateTime  @default(now())
  finishedAt DateTime?
  @@index([userId, estado])
}

model RondaPlinko {
  id           String    @id @default(uuid())
  userId       String
  apuesta      Decimal   @db.Decimal(12,2)
  riesgo       Riesgo               // PEQUENO | MEDIANO | GRANDE
  multiplicador Decimal
  ganancia     Decimal   @db.Decimal(12,2)
  rutaBola     Json                  // trayectoria registrada (auditoría del RNG)
  createdAt    DateTime  @default(now())
  @@index([userId, createdAt])
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String    @unique
  tokenHash String                    // sha256 del refresh token opaco
  expiresAt DateTime
  revokedAt DateTime?
}
```

Principios del dinero:
- Todo `$transaction`: leer saldo con condición → validar → mutar saldo → crear fila `Movimiento`. Nunca se actualiza saldo sin ledger.
- `Decimal` en todo; jamás `Float`.

## 5. Seguridad — diseño completo

### 5.1 Contraseñas (bcrypt, costo 12)
- `bcrypt.hash(password, 12)` en registro; `bcrypt.compare` en login.
- OWASP recomienda ≥10; con 12 damos margen porque es app con saldos.
- Rate-limit en `/auth` (10 req/min por IP) contra fuerza bruta.

### 5.2 IDs públicos con Argon2id (one-time, anti-IDOR)

```
Registro:   internalId (UUID, solo DB) ──argon2id──▶ publicId (~100ms, costo ÚNICO)
                                                    └─ columna VARCHAR(200), UNIQUE, indexada
Consulta:   publicId del cliente ──query indexada──▶ internalId (uso interno)
Respuesta:  siempre publicId. internalId NUNCA sale del server.
```

- Se calcula **solo en el registro**. Las consultas son lecturas por índice (microsegundos) — cero argon2 en el hot path.
- **Recursos propios no aceptan ID en URL**: `/api/users/profile`, `/api/wallet` derivan al usuario del token (`req.user.id`). El cliente no manda su propio ID, no hay nada que manipular.
- Doble defensa: desacoplamiento + el UUID interno tiene 122 bits de entropía y el hash es unidireccional + memory-hard.

### 5.3 JWT
| Token | Duración | Contenido | Almacenamiento server |
|---|---|---|---|
| Access | **30 min** | `{sub: internalId, rol}` firmado con `JWT_ACCESS_SECRET` | stateless |
| Refresh | 7 días | token opaco (48 bytes hex), rotado en cada uso | sha256 en tabla `RefreshToken` |

- Logout = revocar el refresh token (`revokedAt`).
- Refresh rotation: cada uso emite refresh nuevo y revoca el anterior → tokens robados quedan inválidos.

### 5.4 Infraestructura de seguridad
- `helmet` (headers HTTP seguros).
- CORS: solo `https://<proyecto>.web.app` + dominio custom, nunca `*`.
- Rate-limit: general 100 req/min; estricto en `/auth` (10/min) y endpoints de apuestas (30/min).
- RNG de Plinko 100% server-side: semilla aleatoria de 32 bytes registrada en la ronda; la trayectoria se deriva de la semilla (auditable). El cliente jamás influye en el resultado.
- `.env` validado con Zod al arrancar: si falta una variable, el server no levanta.

## 6. Endpoints por módulo

### 🔐 auth
| Método | Ruta | Acción | Protección |
|---|---|---|---|
| POST | `/api/auth/register` | Crea User + Wallet(0) + publicId argon2 | pública |
| POST | `/api/auth/login` | Devuelve access(30min) + refresh | pública |
| POST | `/api/auth/refresh` | Rotar par de tokens | refresh token |
| POST | `/api/auth/logout` | Revocar refresh token | auth |

### 👤 usuarios
| Método | Ruta | Acción | Protección |
|---|---|---|---|
| GET | `/api/users/profile` | Ver perfil (usa req.user) | auth |
| PATCH | `/api/users/profile` | Editar nombre | auth |
| POST | `/api/users/games/:juego/access` | "Ir a los juegos": valida saldo>0, devuelve límites de mesa | auth |

### 💰 billetera
| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/wallet` | Saldo actual |
| GET | `/api/wallet/balance` | Consolidado: `{saldo, bono, total, totalApostado, totalGanado}` |

### 💳 recargas y retiros
| Método | Ruta | Acción | Regla crítica en service |
|---|---|---|---|
| POST | `/api/transactions/deposit` | Recarga simulada | `$transaction`: valida monto, saldo+, ledger |
| POST | `/api/transactions/withdraw` | Retiro | `monto ≤ saldo` verificado dentro del lock (updateMany condicional) |
| GET | `/api/transactions/history` | Historial paginado | filtros por tipo y fechas |

### 🎮 plinko — apuestas pequeñas, medias y grandes
| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/games/plinko/bet` | `{apuesta, riesgo}` → resultado server-side |

- 3 niveles con rango de apuesta propio y tabla de multiplicadores propia:
  - PEQUENO: 1–50, multiplicadores conservadores (máx 5x)
  - MEDIANO: 50–500, medios (máx 15x)
  - GRANDE: 500–5000, extremos (máx 30x)
- Tablero de 9 filas (10 slots), trayectoria simulada y registrada en `rutaBola` + `seed`.
- `$transaction`: validar saldo y rango por riesgo → descontar (APUESTA) → simular → acreditar premio (PREMIO).

### 🃏 blackjack — split, subir la apuesta, salir
| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/games/blackjack/start` | `{apuesta}` — shoe 6 mazos, reparte 2+2 |
| POST | `/api/games/blackjack/:id/hit` | Pedir carta (bust = mano perdida) |
| POST | `/api/games/blackjack/:id/stand` | Plantarse → juega crupier |
| POST | `/api/games/blackjack/:id/split` | Par del mismo valor y saldo para 2ª apuesta (máx 3 manos; ases: 1 carta y plantar) |
| POST | `/api/games/blackjack/:id/double` | "Subir la apuesta" = doblar (solo 2 cartas iniciales) |
| POST | `/api/games/blackjack/:id/exit` | Rendición: recupera 50% de la apuesta |

- Reglas: crupier planta en 17, blackjack natural paga 3:2, hasta 3 manos por split.
- Estado completo (baraja restante, manos, dealer) en JSONB de la partida → sobrevive reinicios del dyno.
- Cada acción = 1 `$transaction`; toda mutación genera sus `Movimiento`s (APUESTA/PREMIO).
- Ownership: la partida se busca por `{id, userId}` → recurso ajeno responde 404 (sin filtrar existencia).

## 7. Variables de entorno

```
DATABASE_URL="postgresql://..."     # pool de la app (pgbouncer de Render)
DIRECT_URL="postgresql://..."       # conexión directa para migrate deploy
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGINS="https://tu-proyecto.web.app"
PORT=10000
```

## 8. Deploy — Render

```yaml
# render.yaml (raíz del repo)
services:
  - type: web
    name: casino-api
    env: node
    rootDir: backend
    buildCommand: npm install && npx prisma generate && npx prisma migrate deploy
    startCommand: node src/server.js
    healthCheckPath: /health
```

- DB: PostgreSQL 18 de Render (se elige versión 18 al crearla) → genera `DATABASE_URL` y `DIRECT_URL`.
- `/health` verifica conexión a DB (200 ok / 503 degraded).
- Frontend (React) se deploya después en Firebase Hosting apuntando a esta API.

## 9. Fases de implementación

| # | Fase | Entregable verificable |
|---|---|---|
| 1 | Cimientos | Proyecto levanta, env validada, migración inicial, `/health` OK |
| 2 | Auth + Usuarios | Registro/login/refresh/logout con argon2 + bcrypt; perfil protegido |
| 3 | Wallet + Transacciones | Depósito y retiro atómicos; historial paginado; ledger consistente |
| 4 | Plinko | Apuesta en 3 riesgos, RNG server-side, premio acreditado con ledger |
| 5 | Blackjack | Motor completo: hit/stand/split/double/exit, evaluador de manos |
| 6 | Deploy | API en Render con DB 18, verificada con peticiones reales |

## 10. Verificación

- Por fase: pruebas manuales contra la DB real + respuestas HTTP verificadas.
- Tests unitarios de motores críticos: cálculo de premio Plinko y evaluador de manos Blackjack.
- Verificación de atomicidad: retiro mayor al saldo → ni el saldo ni el ledger cambian.

---

Decisiones acordadas: DTOs con Zod ejecutados por middleware genérico · auth/authZ en middleware · negocio en service · Prisma en repository · JWT access **30 min** · bcrypt **costo 12** · **Argon2id one-time** como publicId anti-IDOR.
