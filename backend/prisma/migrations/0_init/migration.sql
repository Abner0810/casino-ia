-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('JUGADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('DEPOSITO', 'RETIRO', 'APUESTA', 'PREMIO');

-- CreateEnum
CREATE TYPE "EstadoPartida" AS ENUM ('ACTIVA', 'GANADA', 'PERDIDA', 'EMPATE', 'RENDIDA');

-- CreateEnum
CREATE TYPE "Riesgo" AS ENUM ('PEQUENO', 'MEDIANO', 'GRANDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'JUGADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bono" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "saldoAntes" DECIMAL(12,2) NOT NULL,
    "saldoDespues" DECIMAL(12,2) NOT NULL,
    "juego" TEXT,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaBlackjack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apuesta" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoPartida" NOT NULL DEFAULT 'ACTIVA',
    "baraja" JSONB NOT NULL,
    "dealer" JSONB NOT NULL,
    "manos" JSONB NOT NULL,
    "resultado" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PartidaBlackjack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RondaPlinko" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apuesta" DECIMAL(12,2) NOT NULL,
    "riesgo" "Riesgo" NOT NULL,
    "multiplicador" DECIMAL(10,2) NOT NULL,
    "ganancia" DECIMAL(12,2) NOT NULL,
    "seed" TEXT NOT NULL,
    "rutaBola" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RondaPlinko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Movimiento_userId_createdAt_idx" ON "Movimiento"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PartidaBlackjack_userId_estado_idx" ON "PartidaBlackjack"("userId", "estado");

-- CreateIndex
CREATE INDEX "RondaPlinko_userId_createdAt_idx" ON "RondaPlinko"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaBlackjack" ADD CONSTRAINT "PartidaBlackjack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RondaPlinko" ADD CONSTRAINT "RondaPlinko_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
