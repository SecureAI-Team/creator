# =============================================================================
# Multi-stage Next.js standalone build
# =============================================================================
# For China/Aliyun ECS: uses DaoCloud mirror by default (docker.io is blocked)
# Override with: docker compose build --build-arg REGISTRY=docker.io/library
# =============================================================================

ARG REGISTRY=m.daocloud.io/docker.io/library

# ---------- Stage 1: Install dependencies ----------
FROM ${REGISTRY}/node:22-alpine AS deps
WORKDIR /app

# Use China npm mirror for faster installs on Aliyun ECS
COPY docker/mirrors/npmrc /root/.npmrc

COPY web/package.json web/package-lock.json ./
RUN npm ci --ignore-scripts

# ---------- Stage 2: Build ----------
FROM ${REGISTRY}/node:22-alpine AS builder
WORKDIR /app

# Mirror config (also used when this stage serves as db-init container)
COPY docker/mirrors/npmrc /root/.npmrc

COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./

# Generate Prisma client
RUN npx prisma generate

# Build Next.js in standalone mode
RUN npm run build

# ---------- Stage 3: Production runner ----------
FROM ${REGISTRY}/node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + generated client (needed at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy bridge server and its deps (ws for WebSocket)
COPY --from=builder /app/bridge-server.js ./
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/jose ./node_modules/jose

USER nextjs

EXPOSE 3001 3002

CMD ["sh", "-c", "node bridge-server.js & exec node server.js"]
