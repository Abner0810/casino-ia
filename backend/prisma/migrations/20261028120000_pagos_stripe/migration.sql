-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'FALLIDO', 'EXPIRADO');

-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "pagoId" TEXT;

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "pagadoEn" TIMESTAMP(3),

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripeSessionId_key" ON "Pago"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripePaymentIntentId_key" ON "Pago"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Pago_userId_creadoEn_idx" ON "Pago"("userId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Movimiento_pagoId_key" ON "Movimiento"("pagoId");

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

