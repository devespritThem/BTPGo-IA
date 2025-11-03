Sécurité & Monitoring

Backend
- Helmet, CORS contrôlé via `CORS_ORIGINS`, rate limiting (1k req/15min), audit mutating ops
- JWT court + refresh rotatif, 2FA TOTP, scoping `orgId`
- Endpoint Prometheus: `/metrics`

AI Engine
- Endpoint Prometheus: `/metrics`

Compose/Infra
- Prometheus scrapes backend:4000, ai_engine:8000 (`infra/prometheus.yml`)
- Grafana sur http://localhost:3001 (ajouter Prometheus datasource)

CI/CD
- Trivy image scans dans `deploy.yml` (CRITICAL,HIGH non bloquant)
- Trivy FS scan séparé (`security-trivy.yml`)

Falco & Vault (prod)
- Falco: déployer sur l’hôte/cluster pour surveiller Syscalls et comportements anormaux
- Vault OSS: stocker secrets (JWT, DB, FTP). Injection via env/sidecar. Exemple: `vault kv get -format=json secret/btpgo`.

Recommandations
- Secrets GitHub: limiter accès, rotation périodique
- CSP stricte via Helmet si domaine connu, TLS partout
- Ajoutez tests sécurité (ZAP/Burp) et SAST/CodeQL au pipeline

