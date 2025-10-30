Stack Technique (alignée à la demande)

Backend
- Node.js 22, TypeScript, Express, Prisma, Zod, JWT, Helmet
- Déploiement Fly.io (workflow GitHub Actions)

Frontend
- React 18, Vite, TailwindCSS 3, PWA, Zustand, React Query
- Déploiement o2switch en SFTP (workflow GitHub Actions)

AI Engine
- FastAPI (Python 3.11), spaCy, Tesseract, OpenCV, LangChain (placeholders activés)

DB
- PostgreSQL 15 (Docker en dev)

Infra
- Docker Compose avec: Postgres, Backend, AI Engine, Nginx, Prometheus, Grafana

Sécurité
- Trivy (Actions), Falco (hôte/prod), Vault OSS (optionnel) — voir docs

DNS
- CNAME `app.` → Fly.io, `www.` → o2switch

