-- These changes intentionally live in a second migration. PostgreSQL requires
-- the newly added enum value to be committed before it can be used.

-- Pago
ALTER TABLE "Pago" ALTER COLUMN "stripeSessionId" DROP NOT NULL;
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "operationId" TEXT;
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "parametrosStripe" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "Pago_operationId_key" ON "Pago"("operationId");
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pago" ALTER COLUMN "estado" SET DEFAULT 'CREANDO';

-- PartidaPoker
ALTER TABLE "PartidaPoker" ADD COLUMN IF NOT EXISTS "mesaVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PartidaPoker" ALTER COLUMN "mesaVersion" SET DEFAULT 1;
