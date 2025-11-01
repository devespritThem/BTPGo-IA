# BTPGo - Architecture et Configuration

## Synthèse
- Objectif: lister tout ce qu’il faut configurer pour que le SaaS BTPGo fonctionne de bout en bout (env, secrets, infra, déploiements, monitoring).

## Secrets requis
- Backend obligatoires:
  - `AI_URL_FLY` (URL du moteur IA)
  - `DATABASE_URL` (PostgreSQL Supabase)
  - `JWT_SECRET`
  - `FRONTEND_URL_PROD`
  - `NODE_ENV`
- Emails (si envoi): `EMAIL_ADDRESS` ou `EMAIL_USER`, `EMAIL_PASSWORD` ou `EMAIL_PASS` (standardiser)
- Paiement (si activé): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Déploiement CI: `FLY_API_TOKEN`

## Backend (Node/Express)
- Entrée: `backend/index.js` (importe OTEL, écoute `0.0.0.0:$PORT`)
- App: `backend/src/app.js` (JSON, CORS basé sur `FRONTEND_URL_PROD`, `/api/health`)
- Routes IA: `backend/src/routes/aiRoutes.js` (`GET /api/ai/health`)
- Client IA: `backend/src/services/aiService.js` (axios, `AI_URL_FLY`)
- Observabilité: `backend/otel.js` (HTTP/Express/Prisma, export console)

## IA (FastAPI)
- App: `main.py`
- Conteneur: `Dockerfile`, `requirements.txt`
- Fly: `fly.toml` (app `btpgo-ai`, port 8000, `/health`)

## Déploiement Fly.io
- Backend: `backend/fly.toml` (app `btpgo-backend`, health `/api/health`)
- Workflow: `.github/workflows/deploy-backend-fly.yml` (Flyctl, secrets requis)

## Base de données
- `DATABASE_URL` Supabase; test psql `select 1;`

## Démarrage local
- Backend: `cd backend && npm i && npm start`
- IA: `uvicorn main:app --port 8000`

