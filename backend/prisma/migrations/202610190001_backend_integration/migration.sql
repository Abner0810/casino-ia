-- Refuse ambiguous data rather than silently closing existing games.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "PartidaBlackjack" WHERE estado = 'ACTIVA' GROUP BY "userId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Resolve multiple active Blackjack games per user before applying this migration';
  END IF;
END $$;
ALTER TABLE "PartidaBlackjack" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "PartidaBlackjack_one_active_per_user" ON "PartidaBlackjack" ("userId") WHERE estado = 'ACTIVA';
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken" ("tokenHash");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken" ("expiresAt");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_nonnegative" CHECK (saldo >= 0 AND bono >= 0);
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_positive" CHECK (monto > 0 AND "saldoAntes" >= 0 AND "saldoDespues" >= 0);
CREATE TABLE "Operation" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  key VARCHAR(128) NOT NULL,
  fingerprint TEXT NOT NULL,
  operation TEXT NOT NULL,
  status INTEGER NOT NULL,
  response JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Operation_userId_key_key" ON "Operation" ("userId", key);
ALTER TABLE "Movimiento" ADD COLUMN "operationId" TEXT;
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"(id) ON DELETE SET NULL ON UPDATE CASCADE;
