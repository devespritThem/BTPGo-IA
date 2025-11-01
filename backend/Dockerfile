FROM node:20-alpine AS build

ENV NODE_ENV=production

RUN apk add --no-cache openssl libssl3 libstdc++ dos2unix

WORKDIR /app

# Chemins adaptés au contexte Fly (racine du dépôt)
COPY ./backend/package*.json ./
COPY ./backend/prisma ./prisma
COPY ./backend ./

RUN npm install --omit=dev && dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Génération du client Prisma dans l'image
RUN npx prisma generate

EXPOSE 4000

# Démarrage stable
CMD ["npm", "start"]
