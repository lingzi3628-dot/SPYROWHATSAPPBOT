# Dockerfile for WhatsApp Bot (Baileys 7.0.0-rc14)
# Works on Katabump, Koyeb, Railway, Render, Fly.io, and any container host.
#
# Build:  docker build -t whatsapp-bot .
# Run:    docker run -p 3000:3000 -v $(pwd)/data:/app/data -v $(pwd)/auth_info:/app/auth_info --env-file .env whatsapp-bot

FROM node:22-slim

# ffmpeg is required for media commands (.tomp3, .tovn, .reverse, video stickers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY . .

# Create directories for persistent data
RUN mkdir -p /app/data /app/auth_info /app/tmp

# Environment defaults (override via env vars or .env file)
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_PRETTY=false

EXPOSE 3000

# Healthcheck — hits the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the bot
CMD ["node", "src/index.js"]
