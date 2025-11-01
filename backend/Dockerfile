# ========= Étape 1 : Build environnement Node + OpenSSL =========
FROM node:20-alpine AS build

# Empêche l’interruption en cas de prompt interactif
ENV NODE_ENV=production

# Ajout des librairies nécessaires à Prisma et OpenSSL
RUN apk add --no-cache openssl libssl3 libstdc++ dos2unix

# Création du dossier de travail
WORKDIR /app

# ====== Copy depuis le bon contexte ======
# (Fly build part de la racine du dépôt)
COPY ./backend/package*.json ./
COPY ./backend/prisma ./prisma
COPY ./backend ./

# Installation des dépendances
RUN npm install --omit=dev && dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Génération du client Prisma
RUN npx prisma generate

# ========= Étape 2 : Exécution =========
EXPOSE 4000

# Lancement via npm start
CMD ["npm", "start"]
