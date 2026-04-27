### ---------- Stage 1: deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

### ---------- Stage 2: build ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

### ---------- Stage 3: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

RUN apk add --no-cache curl tini \
  && addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nextjs \
  && mkdir -p /data /data/exports \
  && chown -R nextjs:nodejs /data

# Next standalone (server.js + node_modules mínimo bundled pelo Next)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public (logo, favicons) — Next standalone NÃO copia automaticamente
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Scripts utilitários (export, init-db, entrypoint) + schema SQL
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/db ./db

# Entrypoint roda init-db.mjs antes de levantar o server (migrations
# automáticas). Garante permissão de execução.
RUN chmod +x /app/scripts/entrypoint.sh

USER nextjs
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/scripts/entrypoint.sh"]
