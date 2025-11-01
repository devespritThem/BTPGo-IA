# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./
COPY otel.js ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]

