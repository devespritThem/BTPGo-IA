# ===============================
# Dockerfile for BTPGo Backend (Fly.io fixed)
# ===============================

# 1️⃣ Base image
FROM node:20-alpine

# 2️⃣ Working directory
WORKDIR /app

# 3️⃣ Copy package files and install deps
COPY ../../package*.json ./
RUN npm install --production

# 4️⃣ Copy backend source (depuis ce dossier)
COPY . .

# 5️⃣ Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# 6️⃣ Expose API port
EXPOSE 4000

# 7️⃣ Run server
CMD ["npm", "start"]
