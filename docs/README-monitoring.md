#+ Monitoring (Prometheus + Grafana)

Ce projet embarque un monitoring optionnel activable via un profil Compose.

## Activer le monitoring

- Lancer Prometheus et Grafana avec le profil `monitoring`:

```
docker compose --profile monitoring up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin par défaut; changez le mot de passe)

## Cibles et métriques

- Prometheus scrape:
  - backend: `http://backend:4000/metrics`
  - ai_engine: `http://ai_engine:8000/metrics`
- Config: `monitoring/prometheus/prometheus.yml`

Backend expose:
- `http_requests_total{method,route,status_code}`
- `http_request_duration_seconds{method,route,status_code}` (route = pattern Express, cardinalité maîtrisée)
- `http_errors_total{method,route,class}`
- `auth_events_total{event}` (login_success, login_failed, backup_used, 2fa_disabled)

IA expose les métriques par défaut de `prometheus_client`.

## Bonnes pratiques

- Évitez de taguer les routes avec des IDs variables (utilisez des patterns comme fait ici).
- Ajoutez des alertes (ex: taux d'erreurs 5xx > X% sur 5 min, pics de latence).
- Protégez Grafana derrière un reverse proxy si exposé publiquement.

