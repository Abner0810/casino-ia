BEGIN;

-- Las rondas anteriores permanecen consultables en base de datos, pero solo
-- las nuevas partidas TEXAS_HOLDEM aparecen en el juego actual.
ALTER TABLE "PartidaPoker"
  ADD COLUMN "modalidad" TEXT NOT NULL DEFAULT 'VIDEO_POKER',
  ADD COLUMN "fase" TEXT,
  ADD COLUMN "banca" JSONB,
  ADD COLUMN "comunitarias" JSONB,
  ADD COLUMN "apuestaTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
UPDATE "PartidaPoker" SET "apuestaTotal" = "apuesta";

-- Una partida antigua ACTIVA ya debitó su apuesta. La devolución se registra
-- en el mismo ledger y con saldoAntes/saldoDespues coherentes, antes de cerrarla.
CREATE TEMP TABLE "_legacy_poker_refund" ON COMMIT DROP AS
  SELECT p.id, p."userId", p.apuesta, w.saldo AS "saldoAntes"
  FROM "PartidaPoker" p
  JOIN "Wallet" w ON w."userId" = p."userId"
  WHERE p.modalidad = 'VIDEO_POKER' AND p.estado = 'ACTIVA'
  FOR UPDATE OF p, w;

UPDATE "Wallet" w
SET saldo = w.saldo + r.apuesta, "updatedAt" = CURRENT_TIMESTAMP
FROM "_legacy_poker_refund" r
WHERE w."userId" = r."userId";

INSERT INTO "Movimiento"
  (id, "userId", tipo, monto, "saldoAntes", "saldoDespues", juego, descripcion, "createdAt")
SELECT gen_random_uuid()::text, r."userId", 'PREMIO'::"TipoMovimiento", r.apuesta,
       r."saldoAntes", r."saldoAntes" + r.apuesta, 'poker',
       'Devolución de partida de video póker al cambiar a Texas Hold’em', CURRENT_TIMESTAMP
FROM "_legacy_poker_refund" r;

UPDATE "PartidaPoker" p
SET estado = 'RENDIDA', ganancia = p.apuesta, version = p.version + 1,
    "finishedAt" = CURRENT_TIMESTAMP,
    resultado = jsonb_build_object('motivo', 'MIGRACION', 'ganancia', p.apuesta)
FROM "_legacy_poker_refund" r
WHERE p.id = r.id;

CREATE INDEX "PartidaPoker_userId_modalidad_createdAt_idx"
  ON "PartidaPoker"("userId", modalidad, "createdAt");

COMMIT;
