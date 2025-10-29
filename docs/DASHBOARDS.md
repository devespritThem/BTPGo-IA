Dashboards & Insights

Endpoints (backend)
- `GET /analytics/dashboard` → KPIs org: revenue, cashIn, cost, margin, marginRate, receivables, projects
- `GET /analytics/projects` → liste projets: revenue, paid, cost, margin, marginRate, risk
- `POST /analytics/ask { question }` → Chat IA (intents: cashflow, rentabilité, impayés, risque)

Endpoints (AI Engine)
- `POST /planning/schedule` → proposition planning (météo/ressources)
- `POST /planning/forecast` → score de risque
- `POST /finance/insights` → synthèse rentabilité

Intégration Frontend (idées)
- Dashboard cartes KPIs + courbe cashflow
- Tableau projets: marge et risque
- Zone "Ask your data" (saisissez: marge, cashflow, impayés, risque)

