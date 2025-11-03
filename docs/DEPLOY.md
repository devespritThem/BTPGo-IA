Deploy Guide

Targets
- Backend → Fly.io
- Frontend → o2switch (SFTP)

Secrets (GitHub)
- FLY_API_TOKEN
- SFTP_HOST, SFTP_USER, SFTP_PASS, SFTP_PATH

Workflow
- Voir `.github/workflows/deploy.yml`
- Étapes: lint/test → build images → scans Trivy → deploy backend → health check → build + SFTP frontend

Manual
- Backend: `pwsh scripts/deploy_backend_fly.ps1`
- Frontend: `pwsh scripts/deploy_front_sftp.ps1`

DNS
- CNAME `app.` → `<app>.fly.dev`
- `www.` → o2switch (hébergeur)

Post-deploy
- Health: `GET https://<app>.fly.dev/health`
- Rapports sécurité: artefacts `security-reports` (Trivy JSON)
- Voir `docs/POST_DEPLOY_CHECKLIST.md`

Fly.io (Backend)
- Config: utiliser le `fly.toml` à la racine (port interne `4000`).
- App: par défaut `btpgo-backend` (variable CI `FLY_BACKEND_APP`), à aligner avec Fly.
- Secrets requis: `DATABASE_URL`, `JWT_SECRET`, `DATA_ENCRYPTION_KEY` (+ CORS si besoin).
- Release: la commande de release Prisma est désactivée; les migrations sont gérées par `backend/entrypoint.sh` (tolérance aux erreurs pour ne pas bloquer le déploiement).
- Déployer manuellement: `flyctl deploy --remote-only --config fly.toml -a <app>`.
- Vérifier: `flyctl secrets list -a <app>`, `flyctl logs -a <app>`, `GET /health`.

Supabase (tuning connexions)
- Pour limiter la pression des connexions Prisma côté Supabase, ajoutez à `DATABASE_URL` les paramètres:
  - `pgbouncer=true&connection_limit=1`
- Exemple: `postgresql://...supabase.co:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1`
- Mise à jour du secret Fly:
  - `flyctl secrets set DATABASE_URL="<URL_AJUSTEE>" -a <app>`
- Vérifier la connectivité DB: `GET https://<app>.fly.dev/health?db=1`

