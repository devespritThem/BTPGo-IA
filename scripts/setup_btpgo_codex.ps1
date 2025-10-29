<#
=====================================================================
  setup_btpgo_codex.ps1
  - Nettoyage des conflits + génération d’une base Docker propre
  - Préparation et exécution de Codex pour BTPGo-IA

  Usage:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\scripts\setup_btpgo_codex.ps1 -ProjectRoot ".\BTPGo-IA" -Force
=====================================================================
#>

param(
  [string]$ProjectRoot = "./BTPGo-IA",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$msg) { Write-Host "INFO  $msg" -ForegroundColor Cyan }
function Write-Warn([string]$msg) { Write-Host "WARN  $msg" -ForegroundColor Yellow }
function Write-Err([string]$msg)  { Write-Host "ERROR $msg" -ForegroundColor Red }

function Ensure-Tool {
  param([string]$Cmd, [string]$InstallHint)
  if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
    Write-Err "Outil introuvable : $Cmd"
    if ($InstallHint) { Write-Warn "Conseil d’installation : $InstallHint" }
    throw "Pré-requis manquant : $Cmd"
  }
}

function Backup-And-Remove {
  param([string[]]$Paths, [string]$Root)
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $bakDir = Join-Path $Root ".backup-$stamp"
  New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
  foreach ($p in $Paths) {
    if (-not $p) { continue }
    $full = Join-Path $Root $p
    if (Test-Path $full) {
      $dest = Join-Path $bakDir ($p -replace '[/\\:*?"<>|]','_')
      Write-Warn "Backup & remove: $p -> $dest"
      try { Copy-Item -Path $full -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue } catch {}
      try { Remove-Item -Path $full -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
  Write-Info "Backup enregistré: $bakDir"
}

function Write-File {
  param([string]$Path, [string]$Content)
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $Content | Out-File -FilePath $Path -Encoding UTF8 -Force
  Write-Info "Écrit: $Path"
}

# 1) Pré-requis
Write-Info "Vérification des prérequis…"
Ensure-Tool -Cmd "docker" -InstallHint "Installer Docker Desktop puis redémarrer."
Ensure-Tool -Cmd "node"   -InstallHint "Installer Node.js 22+ depuis nodejs.org."
Ensure-Tool -Cmd "npm"    -InstallHint "Node installe aussi npm."

# 2) Créer racine projet
$proj = Resolve-Path $ProjectRoot -ErrorAction SilentlyContinue
if (-not $proj) {
  New-Item -ItemType Directory -Force -Path $ProjectRoot | Out-Null
  $proj = Resolve-Path $ProjectRoot
}
Write-Info "Racine projet: $($proj.Path)"

# 3) Nettoyage des fichiers en conflit (avec backup)
$toCleanup = @(
  "docker-compose.yml",
  "docker-compose.yaml",
  "infra/nginx/Dockerfile",
  "infra/nginx/nginx.conf",
  "frontend/Dockerfile",
  "backend/Dockerfile",
  "ai_engine/Dockerfile",
  "frontend/node_modules",
  "backend/node_modules",
  "ai_engine/__pycache__",
  "frontend/dist",
  "backend/dist",
  ".env",
  ".env.local"
)
if ($Force) { Backup-And-Remove -Paths $toCleanup -Root $proj.Path }

# 4) Arborescence minimale propre
$folders = @("backend","frontend","ai_engine","infra/nginx","monitoring/prometheus")
foreach($f in $folders) { New-Item -ItemType Directory -Force -Path (Join-Path $proj $f) | Out-Null }

# 5) docker-compose.yml complet
$compose = @"
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: {POSTGRES_USER:-btpgo}
      POSTGRES_PASSWORD: {POSTGRES_PASSWORD:-btpgo}
      POSTGRES_DB: {POSTGRES_DB:-btpgo}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      NODE_ENV: development
      PORT: 4000
      DATABASE_URL: {DATABASE_URL:-postgresql://btpgo:btpgo@postgres:5432/btpgo}
      REDIS_URL: {REDIS_URL:-redis://redis:6379}
      JWT_SECRET: {JWT_SECRET:-change-me}
      FRONTEND_URL: {FRONTEND_URL:-http://localhost:5173}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "4000:4000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    environment:
      VITE_BACKEND_URL: {VITE_BACKEND_URL:-http://localhost:4000}
    depends_on:
      - backend
    ports:
      - "5173:5173"
    restart: unless-stopped

  ai_engine:
    build: ./ai_engine
    environment:
      PYTHONUNBUFFERED: "1"
    ports:
      - "8000:8000"
    restart: unless-stopped

  nginx:
    build: ./infra/nginx
    depends_on:
      - frontend
      - backend
      - ai_engine
    ports:
      - "80:80"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.55.1
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:11.2.0
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  pgdata:
"@
Write-File -Path (Join-Path $proj "docker-compose.yml") -Content $compose

# 6) Dockerfiles de base
$dockerBackend = @"
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npx prisma generate || true
EXPOSE 4000
CMD ["node","index.js"]
"@
Write-File -Path (Join-Path $proj "backend/Dockerfile") -Content $dockerBackend

$dockerFrontend = @"
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || true
EXPOSE 5173
CMD ["npm","run","preview"]
"@
Write-File -Path (Join-Path $proj "frontend/Dockerfile") -Content $dockerFrontend

$dockerAI = @"
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
"@
Write-File -Path (Join-Path $proj "ai_engine/Dockerfile") -Content $dockerAI

$nginxDockerfile = @"FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
"@
Write-File -Path (Join-Path $proj "infra/nginx/Dockerfile") -Content $nginxDockerfile

$nginxConf = @"
user  nginx;
worker_processes  auto;

events {
  worker_connections 1024;
}

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;
  keepalive_timeout  65;

  upstream backend { server backend:4000; }
  upstream frontend { server frontend:5173; }
  upstream ai_engine { server ai_engine:8000; }

  server {
    listen 80;

    location /api/ {
      proxy_pass http://backend/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ai/ {
      proxy_pass http://ai_engine/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
      proxy_pass http://frontend/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
"@
Write-File -Path (Join-Path $proj "infra/nginx/nginx.conf") -Content $nginxConf

# 7) .env.example
$envExample = @"
NODE_ENV=development

# Backend / API
PORT=4000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me

# Base de données
POSTGRES_USER=btpgo
POSTGRES_PASSWORD=btpgo
POSTGRES_DB=btpgo
DATABASE_URL=postgresql://btpgo:btpgo@localhost:5432/btpgo

# Cache / Queue
REDIS_URL=redis://localhost:6379

# Frontend
VITE_BACKEND_URL=http://localhost:4000

# IA (optionnel)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
"@
Write-File -Path (Join-Path $proj ".env.example") -Content $envExample

# 8) Prompt Codex (optionnel)
$prompt = @"
Tu es un assistant IA expert en développement SaaS, DevOps et IA.
Crée/complète entièrement le projet **BTPGo-IA** selon le cahier des charges ci-dessous.

Exigences techniques:
- Backend: Node 22 + Express + Prisma + PostgreSQL (routes: auth, marches, devis, chantiers, users)
- Frontend: React 19 + Vite + Tailwind (Login, Dashboard, Appels d'offres, Chantiers, Comptabilité)
- IA: FastAPI (Python 3.11) endpoints /predict, /health
- Sécurité: JWT, RBAC, logs d’audit
- Docker & Nginx: reverse proxy, healthchecks
- CI/CD: GitHub Actions (lint, build)
- Fournir des README par module et .env.example complet.
"@
Write-File -Path (Join-Path $proj "codex_prompt.txt") -Content $prompt

Write-Info "Base prête. Pour démarrer:"
Write-Host "  docker compose -f `"$($proj.Path)\docker-compose.yml`" up --build" -ForegroundColor Green
Write-Host "  ou: cd $($proj.Path); docker compose up --build" -ForegroundColor Green

# Note: L’invocation 'codex generate' n’existe pas. Utiliser plutôt 'codex exec' si nécessaire.
# Exemple:
# codex exec --full-auto -C "$($proj.Path)" "Finaliser BTPGo-IA conformément au cahier des charges."

