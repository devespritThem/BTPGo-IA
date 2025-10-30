Sécurité (synthèse)

Contrôles applicatifs
- Auth: JWT court + refresh rotatif, 2FA TOTP, multi‑tenant
- CORS contrôlé via `CORS_ORIGINS`, Helmet activé
- Rate limiting (1k/15m), audit mutating ops
- Anti‑fraude: doublons dépenses/paiements, outliers factures

Transport & Nginx
- CSP stricte, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy

CI/CD & images
- Trivy (FS et images) — rapports JSON publiés en artefacts post‑deploy
- Option: rendre bloquant en prod (exit-code 1)

Secrets & Vault
- GitHub Actions Secrets: accès restreint, rotation
- Vault OSS recommandé pour prod (JWT secret, DB creds, FTP)

Monitoring & Alerting
- Prometheus/Grafana pour métriques, Loki pour logs; alertes à configurer selon SLOs

Durcissement à prévoir
- RBAC fin par route/module, signatures webhook, pins TLS, CSP stricte par domaine
- Scans SAST (CodeQL) et DAST (ZAP) en pipeline

