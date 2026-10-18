// Punto de entrada: valida env (Zod), conecta a la DB y levanta el server.
// Si falta una variable de entorno o la DB no responde, no arranca.

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/prisma.client.js';

async function main() {
  await prisma.$connect();
  console.log('✅ Conectado a PostgreSQL');

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    console.log(`🎧 API escuchando en el puerto ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (señal) => {
    console.log(`\n⏹️  ${señal} recibido, cerrando servidor...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('❌ No se pudo iniciar el servidor:', error);
  process.exit(1);
});
