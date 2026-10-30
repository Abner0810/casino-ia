import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/ApiError.js';

let cliente = null;

/**
 * Cliente perezoso: sin STRIPE_SECRET_KEY los pagos responden 503
 * (PAYMENTS_NOT_CONFIGURED) en vez de impedir el arranque del servidor.
 */
export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, 'Los pagos no están configurados en este entorno', undefined, 'PAYMENTS_NOT_CONFIGURED');
  }
  cliente ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 10_000 });
  return cliente;
}

/** Valida la firma del webhook con el cuerpo CRUDO (Buffer). */
export function verificarWebhook(rawBody, firma) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, 'Webhook de pagos no configurado', undefined, 'PAYMENTS_NOT_CONFIGURED');
  }
  return getStripe().webhooks.constructEvent(rawBody, firma, env.STRIPE_WEBHOOK_SECRET);
}
