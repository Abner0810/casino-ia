import express from 'express';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import cors from 'cors';
import { corsConfig } from './config/cors.js';
import { limiterGeneral } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/error.handler.js';
import { prisma } from './shared/prisma.client.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/user.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import transactionsRoutes from './modules/transactions/transaction.routes.js';
import plinkoRoutes from './modules/games/plinko/plinko.routes.js';
import blackjackRoutes from './modules/games/blackjack/blackjack.routes.js';
import operationRoutes from './modules/operations/operation.routes.js';
import { env } from './config/env.js';

export function buildApp() {
  const app = express();

  // Render corre detrás de un proxy: necesario para rate-limit con IP real
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId);
    const started = Date.now();
    res.on('finish', () => {
      if (env.esProduccion) console.log(JSON.stringify({ level: 'info', requestId: req.requestId, method: req.method, status: res.statusCode, durationMs: Date.now() - started }));
    });
    next();
  });
  app.use(cors(corsConfig));
  app.use(express.json({ limit: '100kb' }));
  app.use(limiterGeneral);

  // Health check para Render: verifica que la DB responda
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.set('Cache-Control', 'no-store');
      res.json({ status: 'ok', db: 'up', ...(process.env.RENDER_GIT_COMMIT ? { commit: process.env.RENDER_GIT_COMMIT } : {}) });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/games/plinko', plinkoRoutes);
  app.use('/api/games/blackjack', blackjackRoutes);
  app.use('/api/operations', operationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
