# =============================================================================
# HealthComply Dashboard — Dockerfile
# =============================================================================
# Single-stage build to avoid missing devDependencies at runtime.
# vite is required at runtime because the server uses --packages=external.
# =============================================================================

FROM node:22-alpine

WORKDIR /app

# Install system tools for compliance engine scripts
RUN apk add --no-cache python3 py3-pip bash curl

# Install OPA (Open Policy Agent) for compliance policy evaluation
RUN curl -sL -o /usr/local/bin/opa \
    "https://openpolicyagent.org/downloads/v0.70.0/opa_linux_amd64_static" && \
    chmod +x /usr/local/bin/opa && \
    opa version

# Install Python dependencies needed by the compliance engine
RUN pip3 install --no-cache-dir requests pyyaml --break-system-packages 2>/dev/null || \
    pip3 install --no-cache-dir requests pyyaml

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency files first (for better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (including devDependencies — vite is needed at runtime)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build frontend (Vite) — outputs to dist/public
# Build backend (esbuild) — outputs to dist/index.js
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server in production mode
CMD ["node", "dist/index.js"]
