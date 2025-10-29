BTPGo IA Suite – Architecture

- Backend (Node/Express): Auth (JWT), Projects CRUD, Prisma/Postgres
- AI Engine (FastAPI): /ai, /finance, /gestion microservice endpoints
- Frontend (React/Vite): status page, API integration via VITE_API_URL
- Database: Postgres via Docker (dev), managed in prod
- Infra: Compose in `infra/`, Fly.io config in `infra/fly.toml`

