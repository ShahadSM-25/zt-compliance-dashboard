#!/bin/bash
# =============================================================================
# setup-pnpm-store.sh
# =============================================================================
# Run this ONCE after cloning the repository, before running docker compose.
# It installs Node.js + pnpm (if needed), then downloads all npm packages
# into .pnpm-store/ so that docker build works fully offline.
#
# Supports: Ubuntu/Debian, RHEL/CentOS/Fedora, macOS
#
# Usage:
#   chmod +x setup-pnpm-store.sh
#   ./setup-pnpm-store.sh
# =============================================================================

set -e

echo "Setting up offline pnpm store for Docker build..."
echo "This downloads all packages once and caches them locally."
echo ""

# ── Step 1: Install Node.js if missing ────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 22 LTS..."

    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y ca-certificates curl gnupg
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
            | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
            | sudo tee /etc/apt/sources.list.d/nodesource.list
        sudo apt-get update -qq
        sudo apt-get install -y nodejs

    elif command -v dnf &> /dev/null; then
        sudo dnf install -y nodejs npm

    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
        sudo yum install -y nodejs

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install node@22
        else
            echo "Homebrew not found. Install Node.js from https://nodejs.org"
            exit 1
        fi
    else
        echo "Cannot detect package manager. Install Node.js 22 from: https://nodejs.org/en/download"
        exit 1
    fi

    echo "Node.js installed: $(node --version)"
else
    echo "Node.js found: $(node --version)"
fi

# ── Step 2: Install pnpm if missing ───────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing pnpm 10.4.1..."
    sudo npm install -g pnpm@10.4.1
    echo "pnpm installed: $(pnpm --version)"
else
    echo "pnpm found: $(pnpm --version)"
fi

# ── Step 3: Populate .pnpm-store/ ─────────────────────────────────────────────
STORE_DIR="$(pwd)/.pnpm-store"
echo ""
echo "Downloading packages into: $STORE_DIR"
echo "(This may take a few minutes on first run...)"
echo ""

pnpm install --no-frozen-lockfile --store-dir "$STORE_DIR"

echo ""
echo "Done! pnpm store ready at .pnpm-store/"
echo ""
echo "You can now run:"
echo "  docker compose up --build"
echo ""
