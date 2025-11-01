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

#  Fix Prisma / OpenSSL bug
RUN apk add --no-cache openssl1.1-compat dos2unix

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev && npm install prisma@^5.22.0 --no-save

# Copie des dépendances Prisma depuis deps
COPY --from=deps /app/node_modules/prisma /app/node_modules/prisma
COPY --from=deps /app/node_modules/.prisma /app/node_modules/.prisma

# Copie du code applicatif
COPY . .

# Rend le script d’entrée exécutable
RUN dos2unix entrypoint.sh && chmod 755 entrypoint.sh

EXPOSE 4000
ENTRYPOINT "./entrypoint.sh"
