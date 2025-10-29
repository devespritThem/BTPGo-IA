#+ Observabilité (OpenTelemetry)

Ce projet expose metrics Prometheus (déjà actif) et traces OpenTelemetry.

## Backend (Node)
- Initialisation OTel: `backend/otel.js` (importé en premier par `backend/index.js`)
- Export OTLP HTTP (par défaut `http://localhost:4318/v1/traces`)
- Config via variables:
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (ex: `http://localhost:4318`)
  - `OTEL_SERVICE_NAME` (par défaut `btpgo-backend`)

## IA (FastAPI)
- Instrumentation FastAPI dans `ai_engine/main.py`
- Export OTLP HTTP (par défaut `http://localhost:4318/v1/traces`)
- Config via `OTEL_EXPORTER_OTLP_ENDPOINT`

## Raccorder un collecteur
- Local (ex: Grafana Tempo + Collector OTLP sur 4318)
- Grafana Cloud / Tempo: exposez un endpoint OTLP HTTP et renseignez `OTEL_EXPORTER_OTLP_ENDPOINT`

## Bonnes pratiques
- Conservez les METRICS Prometheus pour agrégations rapides (latences, erreurs)
- Utilisez les TRACES OTel pour le diagnostic (corrélation requêtes → DB → IA)

