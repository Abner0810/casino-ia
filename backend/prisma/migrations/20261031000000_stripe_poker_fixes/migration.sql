-- Stripe y Poker fixes

-- Enum EstadoPago
ALTER TYPE "EstadoPago" ADD VALUE IF NOT EXISTS 'CREANDO';
