# ---- Build image for backend ----
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Installer les libs nécessaires à Prisma et au runtime
RUN apk add --no-cache openssl libssl3 libstdc++ dos2unix

# Copier les fichiers backend depuis la racine
COPY ./backend/package*.json ./
RUN npm install --omit=dev

COPY ./backend/prisma ./prisma
COPY ./backend ./

# Convertir le script et le rendre exécutable (non bloquant)
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh || true

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 4000

# Lancer le serveur Express (via npm start)
CMD ["npm", "start"]
