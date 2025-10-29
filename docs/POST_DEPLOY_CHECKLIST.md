Checklist Post-Deploy

Backend (Fly.io)
- Health OK: `GET https://<app>.fly.dev/health`
- Metrics OK: `GET https://<app>.fly.dev/metrics`
- Auth flow (register-org → access token) OK

Frontend (o2switch)
- Page s’affiche (assets 200), API reachable via `VITE_API_URL`
- PWA: service worker actif

AI Engine
- Health OK: `GET /ai/health` via Nginx proxy `https://<host>/ai/health` (dev)

Monitoring
- Prometheus scrape OK, Grafana datasource OK
- Loki/Promtail: logs visibles dans Grafana Explore

Sécurité
- Trivy artefacts présents dans GitHub Actions (security-reports)
- Headers Nginx présents (CSP, HSTS, X-Frame-Options)

