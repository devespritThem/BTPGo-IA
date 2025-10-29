# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# System deps for Prisma and Node on Alpine
RUN apk add --no-cache openssl libc6-compat

# Install deps
COPY package*.json ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate || true
RUN npm run build

# Run as non-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
