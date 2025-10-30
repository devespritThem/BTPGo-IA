CI/CD GitHub Actions

Workflows
- CI (build): `.github/workflows/ci.yml`
  - Backend: Node 22, Prisma generate + db push (service Postgres 15), build + lint
  - Frontend: Node 22, build (VITE_API_URL placeholder)
  - AI Engine: Python 3.11, install requirements
- Deploy combined: `.github/workflows/deploy.yml`
  - Backend → Fly.io (`FLY_API_TOKEN`)
  - Frontend → o2switch via SFTP (`O2SWITCH_SFTP_*`)
- Security (Trivy): `.github/workflows/security-trivy.yml`

Secrets requis (GitHub)
- `FLY_API_TOKEN` – déploiement Fly.io backend
- `O2SWITCH_SFTP_HOST`, `O2SWITCH_SFTP_USER`, `O2SWITCH_SFTP_PASS`, `O2SWITCH_SFTP_PATH`

Notes
- Pour tests intégration, ajouter jeux de données et specs (Playwright/Postman) si nécessaire.
- Ajoutez une règle de concurrence si besoin pour éviter des déploiements concurrents.

