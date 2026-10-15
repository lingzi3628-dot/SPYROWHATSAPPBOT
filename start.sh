#!/usr/bin/env bash
# ============================================================
# SPYRO WHATSAPP BOT — One-command launcher (macOS / Linux)
# ============================================================
#
# What this does:
#   1. Checks Node.js is installed
#   2. Installs dependencies (first run only)
#   3. Starts the bot + web UI
#   4. Prints the URL where you can scan the QR or get a pairing code
#
# Usage:
#   ./start.sh
# ============================================================

set -e
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  SPYRO WHATSAPP BOT — starting…"
echo "========================================"
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Install it from https://nodejs.org (use Node 20 or newer)"
  echo "   Or on Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi
NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

if ! node -e "const v = process.versions.node.split('.')[0]; if (v < 20) process.exit(1)" 2>/dev/null; then
  echo "❌ Node.js version too old. Need v20 or newer. You have $NODE_VERSION"
  exit 1
fi

# 2. Install deps if needed
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies (first run — takes 1-2 minutes)…"
  npm install
  echo ""
else
  echo "✅ Dependencies already installed"
fi

# 3. Check .env exists
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Copying from .env.example…"
  cp .env.example .env
  echo "   Edit .env to set your OWNER_JID, then re-run ./start.sh"
  exit 1
fi

# 4. Check ffmpeg (optional, for media commands)
if command -v ffmpeg >/dev/null 2>&1; then
  echo "✅ ffmpeg: $(ffmpeg -version 2>&1 | head -1)"
else
  echo "⚠️  ffmpeg not installed — media commands (.tomp3, .tovn, .reverse) won't work."
  echo "   Install on Ubuntu/Debian: sudo apt install ffmpeg"
  echo "   Install on macOS: brew install ffmpeg"
  echo ""
fi

# 5. Start the bot
PORT=$(grep -E "^PORT=" .env | cut -d= -f2 | tr -d '[:space:]')
PORT=${PORT:-3000}

echo ""
echo "========================================"
echo "  🚀 STARTING BOT…"
echo "========================================"
echo ""
echo "  Web UI:  http://localhost:$PORT"
echo ""
echo "  → Open that URL in your browser"
echo "  → You'll see a QR code (scan with WhatsApp)"
echo "  → OR use the 'Phone Pairing' tab to get an 8-char code"
echo ""
echo "  Press Ctrl+C to stop the bot"
echo "========================================"
echo ""

exec node src/index.js
