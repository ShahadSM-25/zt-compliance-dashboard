# =============================================================================
# HealthComply Dashboard — Dockerfile
# =============================================================================
# Multi-stage build: build the frontend, then run the backend server.
# =============================================================================

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm via npm (more reliable than corepack in Docker)
RUN npm install -g pnpm@10.4.1

# Copy dependency files first (for better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (including devDependencies needed for build)
# Use --no-frozen-lockfile to allow minor lock file differences
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build frontend (Vite) + backend (esbuild)
RUN pnpm build

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Install Python3 and system tools for running the compliance engine scripts
RUN apk add --no-cache python3 py3-pip bash curl

# Install Python dependencies needed by the compliance engine
RUN pip3 install --no-cache-dir requests pyyaml --break-system-packages 2>/dev/null || \
    pip3 install --no-cache-dir requests pyyaml

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --no-frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
