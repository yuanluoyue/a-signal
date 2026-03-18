# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/*/package.json ./packages/*/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Copy source code
COPY package.json pnpm-workspace.yaml* ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages
COPY tsconfig.json* ./

# Build the application
WORKDIR /app/apps/frontend
RUN pnpm run build

# ==========================================
# Stage 3: Runner (Production)
# ==========================================
FROM nginx:alpine AS runner

# Copy custom nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set permissions
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8001/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
