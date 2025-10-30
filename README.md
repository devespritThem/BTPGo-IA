BTPGo IA Suite — README

Vision Globale
- Plateforme SaaS pour le BTP: pilotage projets, finance/compta/cashflow, IA (OCR, prévision, insights), RH & matériel, marketplace, financement/assurance, maintenance post‑livraison, ESG/carbone.
- Approche modulaire, coûts maîtrisés, déploiements simples, sécurité intégrée et observabilité de bout en bout.

Stack Technique
- Backend: Node.js 22, TypeScript, Express, Prisma, Zod, JWT rotatif + 2FA, Helmet, Prometheus metrics
- Frontend: React 18, Vite, TailwindCSS, PWA, Zustand, React Query
- AI Engine: FastAPI (Python 3.11), spaCy, Tesseract, OpenCV, LangChain (placeholders), Prometheus metrics
- DB: PostgreSQL 15 (Docker dev / managé en prod)
- Infra: Docker Compose (db, backend, frontend, ai_engine, nginx, prometheus, grafana, loki, promtail)
- CI/CD: GitHub Actions (CI, Deploy Fly.io + SFTP, Trivy scans)

Modules (aperçu)
- Auth & Multi‑tenant: organisations, rôles, JWT rotatif, 2FA TOTP
- Projets & Gantt: tâches, dépendances, planification/forecast IA (météo/ressources)
- Finance & Comptabilité: clients, fournisseurs, factures/lignes, dépenses, paiements, cashflow, profitabilité
- IA & OCR: appels d’offres (PDF/images) → OCR + extraction; insights rentabilité; assistant texte/vocal
- RH & Matériel: employés, QR pointage, équipements, logs d’utilisation
- Marketplace: annonces, candidatures, matching, commissions
- Financement & Assurance: scoring/risque, demandes financement/assurance
- Maintenance & Satisfaction: tickets, garanties, enquêtes
- Abonnements: plans, souscriptions
- ESG/Carbone: facteurs, émissions par projet, recommandations
- Fichiers: upload + versioning, téléchargement
- Analytics & Dashboards: KPIs, projets, “Ask your data”

Démarrage Rapide (Docker)
1) `cd BTPGo-IA-Suite`
2) Copier `.env.example` → `.env` et `backend/.env.example` → `backend/.env`
3) Démarrer la base seule: `docker compose -f infra/docker-compose.yml up -d db`
4) Backend (premier run):
   - `cd backend && npm ci && npx prisma migrate dev && npm run dev`
5) AI Engine: `cd ai_engine && pip install -r requirements.txt && uvicorn app.main:app --reload`
6) Frontend: `cd frontend && npm ci && npm run dev`
7) Stack complète: `docker compose -f infra/docker-compose.yml up --build`

Scripts PowerShell (Windows)
- Setup: `pwsh scripts/setup_btpgo.ps1 -WithCompose -Migrate`
- Dev: `pwsh scripts/dev.ps1 -All` ou `-Compose`
- Build Docker + Up: `pwsh scripts/btpgo_auto_build.ps1 -Detach`
- DB: `pwsh scripts/db.ps1 -Cmd migrate|deploy|seed|studio`
- Deploy: `pwsh scripts/deploy_backend_fly.ps1` et `pwsh scripts/deploy_front_sftp.ps1`
- E2E: `pwsh scripts/test_end_to_end.ps1 -BaseUrl http://localhost:3000`

Commandes Docker utiles
- Base: `docker compose -f infra/docker-compose.yml up -d db`
- Full stack: `docker compose -f infra/docker-compose.yml up --build`
- Stop: `docker compose -f infra/docker-compose.yml down -v`

Variables d’Environnement (essentiel)
- Backend: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `AI_ENGINE_URL`, `STORAGE_DIR`, `CORS_ORIGINS`, `ACCESS_TTL`, `REFRESH_TTL_MS`
- Frontend: `VITE_API_URL`
- AI Engine: `SPACY_MODEL`
- CI/CD: `FLY_API_TOKEN`, `SFTP_HOST`, `SFTP_USER`, `SFTP_PASS`, `SFTP_PATH`
- Voir `docs/ENV.md` pour la liste détaillée

Liens Production (exemple / à adapter)
- Backend (Fly.io): `https://<app>.fly.dev/health`
- Frontend (o2switch): `https://www.msmarrakech.com/`
- API via Nginx (dev): `http://localhost:8080/api/health`

CI/CD (Deploy)
- Workflow: `.github/workflows/deploy.yml`
  - Lint + tests (Jest/Vitest/Pytest si présents), build images, scans Trivy (table + JSON artifacts)
  - Déploiement Backend (Fly.io) + Health check `/health`
  - Déploiement Frontend (SFTP)

Documentation
- Index: `docs/README.md`
- Setup local: `docs/local-setup.md`
- Déploiement: `docs/deploy.md`
- Modules détaillés: `docs/modules.md`
- Sécurité: `docs/security.md`
- Roadmap: `docs/roadmap.md`


API Aperçu (backend)
- `GET /health`
- Auth: `POST /auth/register`, `POST /auth/login`
- Projets: `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`
- Finance:
  - Clients: `GET /finance/customers`, `POST /finance/customers`
  - Fournisseurs: `GET /finance/suppliers`, `POST /finance/suppliers`
  - Factures: `POST /finance/invoices`, `GET /finance/invoices/:id` (avec totaux)
  - Marges: `GET /finance/project/:projectId/margin`
- IA: `POST /ai/estimate` (proxy vers AI Engine `/ai/prompt`)
 - Appels d’offres: `POST /tenders/extract` (upload PDF/images → OCR & extraction)
 - 2FA TOTP: `/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/login`
 - Multi-tenant: `/auth/register-org`, tokens avec `orgId`, header `X-Org-Id` possible
 - Tokens: `/auth/token/refresh` (rotation), `/auth/logout`

Planification & Prévision (IA)
- Gantt: `GET/POST /gantt/projects/:projectId/tasks`
- Planification: `POST /gantt/schedule` (météo+ressources → planning)
- Prévision délais: `POST /gantt/forecast` (risque et durée)

RH & Matériel
- Employés: `GET/POST /hr/employees`, `GET /hr/employees/:id/qr`
- Pointage: `POST /hr/attendance/checkin`, `POST /hr/attendance/checkout`, `GET /hr/attendance`
- Vision: `POST /vision/qr/scan` (validation QR via AI Engine)

