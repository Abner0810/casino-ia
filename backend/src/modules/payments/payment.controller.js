import * as service from './payment.service.js';
import { verificarWebhook } from './stripe.client.js';

const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const consultar = manejar(async (req, res) => {
  res.json(await service.consultarPago(req.user.id, req.params.id));
});

export const sincronizar = manejar(async (req, res) => {
  res.json(await service.sincronizarPago(req.user.id, req.params.id));
});

/** Webhook: req.body es Buffer (express.raw) y va firmado por Stripe. */
export const webhook = manejar(async (req, res) => {
  const firma = req.get('stripe-signature');
  if (!firma) return res.status(400).json({ error: 'Falta la firma de Stripe' });

  let evento;
  try {
    evento = verificarWebhook(req.body, firma);
  } catch {
    return res.status(400).json({ error: 'Firma de webhook inválida' });
  }

  try {
    const resultado = await service.procesarEvento(evento);
    res.json({ received: true, ...resultado });
  } catch (error) {
    // Error transitorio: 500 para que Stripe reintente. Un mismatch de
    // negocio se resuelve en el servicio con 200 y sin acreditar.
    console.error(JSON.stringify({ level: 'error', evento: 'stripe_webhook', type: evento.type, codigo: error.code ?? 'INTERNAL_ERROR' }));
    res.status(500).json({ error: 'No se pudo procesar el webhook' });
  }
});
