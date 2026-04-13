FROM node:22.22.2-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY apps/backend/package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm config set auto-install-peers true && \
    pnpm install --prod && \
    npm rebuild bcrypt

FROM node:22.22.2-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --create-home nestjs

COPY apps/backend/dist ./dist
COPY apps/backend/migrations ./migrations
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend/package.json ./
COPY apps/backend/docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh && \
    chown -R nestjs:nodejs /app

USER nestjs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
