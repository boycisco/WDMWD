# syntax=docker/dockerfile:1.7

# ─── Builder ───────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# better-sqlite3 needs build tools if no prebuilt binary matches
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json ./
RUN npm ci


COPY . .
# Build-time env placeholders — satisfy the config validator during
# `next build`. Real values are injected at runtime via compose's
# `env_file: .env`. These are NOT baked into the image layer (they're
# only in the build stage, which is discarded).
ARG GEMINI_API_KEY=build-time-placeholder
ARG OPENAI_API_KEY=build-time-placeholder
ARG ALCHEMY_API_KEY=build-time-placeholder
ARG BASE_RPC_URL=https://mainnet.base.org
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV ALCHEMY_API_KEY=$ALCHEMY_API_KEY
ENV BASE_RPC_URL=$BASE_RPC_URL

RUN npm run build

# ─── Runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone bundle (Next.js runtime + node_modules it needs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle migrations + config, run at startup
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Persistent data volume mount point
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

# Run migrations then start the server. Migrations are idempotent —
# if the DB is already up to date, they no-op.
# Migrations run inside instrumentation-node.ts (via drizzle-orm's
# runtime migrator). The Next.js standalone bundle already contains
# all runtime dependencies, including better-sqlite3's native binding.
CMD ["node", "server.js"]