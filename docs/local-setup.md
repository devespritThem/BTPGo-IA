Local Setup (Dev)

Prerequisites
- Node.js 22, npm
- Python 3.11 + pip (AI Engine)
- Docker (optional but recommended)

Steps
1) Clone repo puis `cd BTPGo-IA-Suite`
2) Copier `.env.example` → `.env`, et `backend/.env.example` → `backend/.env`
3) Démarrer Postgres (option Docker): `docker compose -f infra/docker-compose.yml up -d db`
4) Backend
   - `cd backend && npm ci && npx prisma migrate dev && npm run dev`
   - Health: `http://localhost:3000/health`
5) AI Engine
   - `cd ai_engine && pip install -r requirements.txt && uvicorn app.main:app --reload`
   - Health: `http://localhost:8000/health`
6) Frontend
   - `cd frontend && npm ci && npm run dev`
7) Full stack via Compose: `docker compose -f infra/docker-compose.yml up --build`

PowerShell helpers
- `pwsh scripts/setup_btpgo.ps1 -WithCompose -Migrate`
- `pwsh scripts/dev.ps1 -All` ou `-Compose`
- `pwsh scripts/test_end_to_end.ps1`

Troubleshooting
- Tesseract/OpenCV requis pour OCR/vision (installez sur l’OS si nécessaires)
- spaCy models (ex: `python -m spacy download fr_core_news_sm`)

