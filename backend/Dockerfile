FROM node:20-alpine
ENV NODE_ENV=production
RUN apk add --no-cache openssl libssl3 libstdc++ dos2unix
WORKDIR /app
COPY ./backend/package*.json ./
RUN npm install --omit=dev
COPY ./backend/prisma ./prisma
COPY ./backend ./
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh  true
RUN npx prisma generate
EXPOSE 4000
CMD "node", "index.js"