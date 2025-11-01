# =========================================================
# 🚀 BTPGo Backend - Dockerfile compatible Fly.io + Prisma
# =========================================================

FROM node:20-alpine AS base
WORKDIR /app

# ---- DEPS ----
FROM base AS deps
COPY package*.json ./
RUN npm ci || npm install
COPY prisma ./prisma
RUN npx prisma generate || true

# ---- RUNTIME ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# ✅ Fix OpenSSL + Prisma on musl
RUN apk add --no-cache openssl dos2unix
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl"
ENV LD_LIBRARY_PATH="/lib:/usr/lib"

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev && npm install prisma@^5.22.0 --no-save

COPY --from=deps /app/node_modules/prisma /app/node_modules/prisma
COPY --from=deps /app/node_modules/.prisma /app/node_modules/.prisma

COPY . .
RUN dos2unix entrypoint.sh && chmod 755 entrypoint.sh

EXPOSE 4000
ENTRYPOINT "./entrypoint.sh"
