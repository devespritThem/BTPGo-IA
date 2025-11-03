# ---- Build image for backend ----
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Installer les libs nécessaires à Prisma et au runtime
# Certificats CA requis pour les connexions TLS (ex: Supabase/Postgres)
RUN apk add --no-cache ca-certificates openssl libssl3 libstdc++ dos2unix

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

# Utiliser un entrypoint tolérant aux erreurs pour migrations/seed
ENTRYPOINT ["./entrypoint.sh"]

# Lancer le serveur Express
CMD ["node", "index.js"]
