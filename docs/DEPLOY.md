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

Post‑deploy
- Health: `GET https://<app>.fly.dev/health`
- Rapports sécurité: artefacts `security-reports` (Trivy JSON)
- Voir `docs/POST_DEPLOY_CHECKLIST.md`

