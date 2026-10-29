CREATE TABLE "RondaRuleta" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "apuesta" DECIMAL(12,2) NOT NULL,
  "tipo" TEXT NOT NULL,
  "seleccion" TEXT NOT NULL,
  "numero" INTEGER NOT NULL,
  "multiplicador" INTEGER NOT NULL,
  "ganancia" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RondaRuleta_userId_createdAt_idx" ON "RondaRuleta"("userId", "createdAt");
CREATE TABLE "PartidaPoker" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "apuesta" DECIMAL(12,2) NOT NULL,
  "estado" "EstadoPartida" NOT NULL DEFAULT 'ACTIVA',
  "cartas" JSONB NOT NULL,
  "baraja" JSONB NOT NULL,
  "resultado" JSONB,
  "ganancia" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);
CREATE INDEX "PartidaPoker_userId_estado_idx" ON "PartidaPoker"("userId", "estado");
CREATE UNIQUE INDEX "PartidaPoker_one_active_per_user" ON "PartidaPoker"("userId") WHERE estado = 'ACTIVA';
