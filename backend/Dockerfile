FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for dev (generator) and prod
FROM base AS deps
COPY package*.json ./
RUN npm ci || npm install
# Copy Prisma schema for client generation
COPY prisma ./prisma
RUN npx prisma generate || true

# Runtime image: minimal prod deps + prisma CLI for release_command
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev \
 && npm install prisma@^5.22.0 --no-save
COPY --from=deps /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=deps /app/node_modules/.prisma /app/node_modules/.prisma
# App source
COPY . .
# Prisma schema needed if generate is triggered
COPY prisma ./prisma
RUN chmod +x ./entrypoint.sh || true
EXPOSE 4000
ENTRYPOINT ["./entrypoint.sh"]
