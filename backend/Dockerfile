# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app && chown node:node /app
WORKDIR /app
USER node

FROM base AS dependencies
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma
RUN npm ci && npm run build

# Contiene CLI Prisma y pruebas: migraciones, desarrollo y verificación.
FROM dependencies AS development
COPY --chown=node:node . .
ENV NODE_ENV=development PORT=3000
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev && npm cache clean --force

FROM base AS production
ENV NODE_ENV=production PORT=3000
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "src/server.js"]
