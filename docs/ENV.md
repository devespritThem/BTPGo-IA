Variables d’environnement

Backend
- DATABASE_URL: URL Postgres (ex: postgresql://postgres:postgres@localhost:5432/btpgo?schema=public)
- JWT_SECRET: secret JWT
- PORT: port API (par défaut 3000)
- AI_ENGINE_URL: URL du service IA (par défaut http://localhost:8000)
- STORAGE_DIR: dossier de stockage fichiers versionnés (par défaut storage)
- ACCESS_TTL: durée access token (ex: 15m)
- REFRESH_TTL_MS: durée refresh (ms, ex: 604800000)
- CORS_ORIGINS: origines autorisées séparées par virgules
- VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY: clés push (optionnel)

Frontend
- VITE_API_URL: URL API backend

AI Engine
- SPACY_MODEL: modèle spaCy à charger (ex: fr_core_news_sm)

CI/CD Secrets (GitHub)
- FLY_API_TOKEN: déploiement Fly.io backend
- SFTP_HOST / SFTP_USER / SFTP_PASS / SFTP_PATH: déploiement frontend o2switch

