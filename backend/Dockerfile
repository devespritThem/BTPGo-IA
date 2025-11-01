# backend/Dockerfile (contexte local backend)
# ========= Étape 1 : Build environnement Node + OpenSSL =========
FROM node:20-alpine AS build

ENV NODE_ENV=production

# Librairies nécessaires à Prisma et OpenSSL
RUN apk add --no-cache openssl libssl3 libstdc++ dos2unix

WORKDIR /app

# Copie directe depuis le dossier backend (pas de ./backend/)
COPY package*.json ./
COPY prisma ./prisma
COPY . .

# Install dépendances + compat script
RUN npm install --omit=dev && dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Génération du client Prisma
RUN npx prisma generate

# ========= Étape 2 : Exécution =========
EXPOSE 4000

# Lancement via script d’entrée tolérant (migrations non bloquantes)
ENTRYPOINT "./entrypoint.sh"

