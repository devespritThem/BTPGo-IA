Runbook – Ops & Release

Release
1) Branch + PR → CI (build/tests) OK
2) Merge main → Deploy workflow se déclenche
3) Vérifier health backend: `https://<app>.fly.dev/health`
4) Vérifier frontend déployé via SFTP
5) Consulter artefacts `security-reports` (Trivy JSON)

Rollback
- Backend Fly.io: redeploy tag précédent via `flyctl releases` / `flyctl deploy --image <tag>`
- Frontend: ré-uploader dist précédent (artifact build) vers SFTP

Scaling & Logs
- Fly.io: `fly scale`, `fly logs`
- Monitoring local: Prometheus/Grafana/Loki via compose

DB
- Migrations Prisma en CI (db push) et prod (migrate deploy)
- Backups Postgres managés en prod recommandés

Incidents
- Health /metrics /logs (Loki) pour diagnostiquer
- Activer alerting Grafana/Prometheus selon besoins

