# =========================================================
# 🚀 BTPGo Backend - Dockerfile compatible Fly.io + Prisma
# =========================================================

FROM node:20-alpine AS base
# cache-bust label to force rebuild when needed
LABEL org.opencontainers.image.description="BTPGo backend image"
WORKDIR /app

# Étape 1 : installation des dépendances
FROM base AS deps
COPY ./backend/package*.json ./
RUN npm ci || npm install

# Étape 2 : génération du client Prisma
COPY ./backend/prisma ./prisma
RUN npx prisma generate || true

# Étape 3 : runtime final
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache dos2unix

# Copie des fichiers essentiels
COPY ./backend/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev \
 && npm install prisma@^5.22.0 --no-save

# Copie du code et des fichiers Prisma
COPY --from=deps /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=deps /app/node_modules/.prisma /app/node_modules/.prisma
COPY ./backend ./
COPY ./backend/prisma ./prisma

# Lancement
RUN dos2unix entrypoint.sh && chmod 755 entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./entrypoint.sh"]
