#!/bin/bash
# =============================================================================
# setup-pnpm-store.sh
# =============================================================================
# Run this ONCE after cloning the repository, before running docker compose.
# It downloads all npm packages into .pnpm-store/ so that docker build
# works fully offline (no ETIMEDOUT errors from npm registry).
#
# Usage:
#   chmod +x setup-pnpm-store.sh
#   ./setup-pnpm-store.sh
# =============================================================================

set -e

echo "📦 Setting up offline pnpm store for Docker build..."
echo "   This downloads all packages once and caches them locally."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing..."
    npm install -g pnpm@10.4.1
fi

# Install dependencies using a local store inside the project
STORE_DIR="$(pwd)/.pnpm-store"
echo "📁 Store directory: $STORE_DIR"

pnpm install \
    --no-frozen-lockfile \
    --store-dir "$STORE_DIR"

echo ""
echo "✅ pnpm store ready at .pnpm-store/"
echo "   You can now run: docker compose up --build"
