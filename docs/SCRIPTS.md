Scripts PowerShell (Windows)

setup.ps1
- Copies env files, creates storage, optionally starts DB via Compose
- Usage: `pwsh scripts/setup.ps1 [-WithCompose]`

dev.ps1
- Start services in dev mode
- Usage:
  - Backend: `pwsh scripts/dev.ps1 -Backend`
  - Frontend: `pwsh scripts/dev.ps1 -Frontend`
  - AI Engine: `pwsh scripts/dev.ps1 -AI`
  - All or Compose: `pwsh scripts/dev.ps1 -All` or `-Compose`

build.ps1
- Build backend/frontend locally or Docker images with -Docker
- Usage: `pwsh scripts/build.ps1` or `pwsh scripts/build.ps1 -Docker`

compose.ps1
- Wrapper for Docker Compose (infra/docker-compose.yml)
- Usage: `pwsh scripts/compose.ps1 -Action up -Detach` | `-Action down`

db.ps1
- Prisma commands: migrate/deploy/seed/studio
- Usage: `pwsh scripts/db.ps1 -Cmd migrate`

deploy.ps1
- Deploy backend via Fly.io CLI, frontend via CI SFTP
- Usage: `pwsh scripts/deploy.ps1 -BackendFly` | `-FrontendSftp`

git-init-push.ps1
- Initialize, commit, set remote and push
- Usage: `pwsh scripts/git-init-push.ps1 -Remote https://github.com/org/BTPGo-IA-Suite.git`

clean.ps1
- Stop compose, prune Docker, remove node_modules/dist/logs
- Usage: `pwsh scripts/clean.ps1`

security.ps1
- Trivy filesystem scan
- Usage: `pwsh scripts/security.ps1 -Trivy`

setup_btpgo.ps1
- Installe dépendances (npm/pip) et prépare `.env`, stockage, DB optionnelle
- Usage: `pwsh scripts/setup_btpgo.ps1 [-WithCompose] [-Migrate]`

btpgo_auto_build.ps1
- Build Docker images (backend/frontend/ai) puis `docker compose up --build`
- Usage: `pwsh scripts/btpgo_auto_build.ps1 -Detach`

deploy_backend_fly.ps1
- Déploie le backend via Fly.io (`flyctl` requis)
- Usage: `pwsh scripts/deploy_backend_fly.ps1`

deploy_front_sftp.ps1
- Upload du frontend `dist/` via SFTP (WinSCP .NET si dispo, fallback psftp)
- Variables: `O2SWITCH_SFTP_HOST/USER/PASS[/PATH]`
- Usage: `pwsh scripts/deploy_front_sftp.ps1`

test_end_to_end.ps1
- Test d’intégration: health → register-org → project → finance → messages → analytics
- Usage: `pwsh scripts/test_end_to_end.ps1 -BaseUrl http://localhost:4000`
