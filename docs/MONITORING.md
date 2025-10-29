Monitoring (Prometheus + Grafana)

Compose
- Services: `prometheus` (9090), `grafana` (3001), `loki` (3100), `promtail`
- Config Prometheus: `infra/prometheus.yml` (cibles backend/ai_engine)
- Loki: `infra/loki-config.yml`; Promtail: `infra/promtail-config.yml` (scrape Docker logs)

Grafana
- Accès: http://localhost:3001 (admin/admin par défaut, changez le mot de passe)
- Datasources: Prometheus (http://prometheus:9090), Loki (http://loki:3100)
- Dashboards: latence routes, erreurs; Logs via Explore (Loki)

Notes
- Exposez des métriques (ex: /metrics) côté backend/AI pour enrichir le scraping
- Intégration Nginx exporter possible pour métriques HTTP
