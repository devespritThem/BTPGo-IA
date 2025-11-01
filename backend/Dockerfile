# ---- backend/Dockerfile (Fly-proof) ----
FROM node:20-alpine AS build

ENV NODE_ENV=production

# Librairies requises pour Prisma (musl + OpenSSL)
RUN apk add --no-cache openssl libssl3 libcrypto3 libstdc++ dos2unix

WORKDIR /app

# Copier les fichiers du backend (depuis la racine)
COPY ./backend/package*.json ./
COPY ./backend/prisma ./prisma
COPY ./backend ./

# Installer dépendances et préparer Prisma
RUN npm install --omit=dev && dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Génération du client Prisma dans l'image
RUN npx prisma generate

EXPOSE 4000

# Démarrage stable (migrations gérées par release_command)
CMD ["npm", "start"]
