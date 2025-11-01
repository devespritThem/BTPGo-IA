# =========================================================
# 🚀 BTPGo Backend - Dockerfile compatible Fly.io + Prisma
# =========================================================

FROM node:20-slim AS base
WORKDIR /app

# ---- DEPS ----
FROM base AS deps
COPY package*.json ./
RUN npm ci || npm install
COPY prisma ./prisma
RUN npx prisma generate || true

# ---- RUNTIME ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install OpenSSL and utils (Debian/Ubuntu)
RUN apt-get update && apt-get install -y openssl dos2unix && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev && npm install prisma@^5.22.0 --no-save

COPY --from=deps /app/node_modules/prisma /app/node_modules/prisma
COPY --from=deps /app/node_modules/.prisma /app/node_modules/.prisma

COPY . .
RUN dos2unix entrypoint.sh && chmod 755 entrypoint.sh

EXPOSE 4000
ENTRYPOINT "./entrypoint.sh"
