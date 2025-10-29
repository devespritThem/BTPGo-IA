## Déploiement BTPGo-IA (Railway + o2switch)

### Checklist rapide (à faire, dans l’ordre)
- Variables d’environnement prêtes et sans secrets commités (.env non versionné).
- Secrets CI/GitHub configurés: `DATABASE_URL`, `BACKEND_URL`, `STRIPE_*`, `OIDC_*` selon besoin.
- Exécuter les migrations Prisma en prod: `prisma migrate deploy` (via job `migrations` Docker ou workflow CI).
- Backend: `JWT_SECRET` fort et `DATA_ENCRYPTION_KEY` 32 bytes base64/hex définis.
- Frontend: `VITE_BACKEND_URL` pointant vers votre API (ex: https://api.mondomaine.com).
- DNS CNAME configurés et SSL actifs (Railway + o2switch).

### Fly.io (Backend et AI)
- Workflows GitHub: `.github/workflows/fly-backend.yml`, `.github/workflows/fly-ai.yml`
- Secrets requis côté GitHub:
  - Commun: `FLY_API_TOKEN`
  - Backend: `DATABASE_URL`, `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `FRONTEND_URL_PROD`, `BACKEND_URL_FLY` (ex: https://btpgo-backend.fly.dev ou domaine custom)
  - AI: `AI_URL_FLY` (ex: https://btpgo-ai.fly.dev ou domaine custom)
- Post-déploiement:
  - Le workflow backend attend `BACKEND_URL_FLY/health` puis lance un smoke test (`/`, `/health`, `/metrics`).
  - Le workflow AI attend la racine `/` et vérifie `/metrics`.
  - Les checks échouent si les endpoints ne répondent pas (visibilité rapide sur régression de déploiement).
  - Le workflow backend configure aussi `MIGRATE_ON_START=true` et `SEED=false` comme secrets Fly (migration au démarrage, pas de seed en prod).
  - Si `FRONTEND_URL_PROD` est défini, un check HTTP simple est lancé sur l’accueil du frontend pour valider la publication.


### Vue d'ensemble
- Frontend (static): o2switch via SFTP → `msmarrakech.com`
- Backend (Node): Railway → `api.msmarrakech.com`
- IA (FastAPI): Railway → `ai.msmarrakech.com`
- Base de données: Supabase (Direct Connection, sslmode=require)

### DNS / SSL
- `msmarrakech.com` + `www` → o2switch (A/AAAA depuis cPanel) + Let's Encrypt.
- `api.msmarrakech.com` → CNAME vers votre domaine Railway Backend.
- `ai.msmarrakech.com` → CNAME vers votre domaine Railway AI.
- Activer SSL sur Railway (custom domain) et sur o2switch (Let's Encrypt).

### Variables d'environnement (prod)
- Supabase: `DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:5432/postgres?sslmode=require`
- Backend: `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `FRONTEND_URL=https://msmarrakech.com`
- Frontend: `VITE_BACKEND_URL=https://api.msmarrakech.com`

### Workflows GitHub Actions
- Frontend → o2switch: `.github/workflows/deploy-frontend-o2switch.yml`
  - Secrets requis: `SFTP_HOST`, `SFTP_USERNAME`, `SFTP_PASSWORD`, `SFTP_REMOTE_PATH`, `BACKEND_URL_PROD`.
- Backend → Railway: `.github/workflows/deploy-backend-railway.yml`
  - Secrets requis: `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`.
- IA → Railway: `.github/workflows/deploy-ai-railway.yml`
  - Secrets requis: `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`.

### Préparer Railway
1. Créer un projet Railway et deux services (backend, ai_engine) en pointant respectivement vers `backend/` et `ai_engine/`.
2. Dans Railway, définir les variables d'env pour chaque service (voir ci-dessus), surtout `DATABASE_URL` (Supabase), `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `FRONTEND_URL` pour le backend.
3. Récupérer `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID` et les ajouter comme secrets GitHub.
4. Ajouter le domaine custom pour chaque service (api., ai.) et suivre la vérification DNS (CNAME).

### Déploiement manuel initial
1. Migrations/seed sur Supabase (en local): `docker compose run --rm migrations`
2. Pousser sur `main` pour déclencher les workflows.

### o2switch (Frontend)
1. Créer un compte SFTP et un dossier cible (ex: `public_html/`).
2. Définir les secrets SFTP dans GitHub.
3. Le workflow construit `frontend/dist/` et l'upload vers `SFTP_REMOTE_PATH`.

### Observabilité (optionnel)
- Activer le profil monitoring localement: `docker compose --profile monitoring up -d`.
- En prod, envisager UptimeRobot et Sentry.
