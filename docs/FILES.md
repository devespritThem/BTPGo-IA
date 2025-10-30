Upload & Versioning de fichiers

Modèles
- ProjectFile: (projectId, name, currentVersionId)
- FileVersion: (fileId, version, hash, size, mimeType, storagePath, uploadedById, note)

Config
- `backend/.env`: `STORAGE_DIR=storage` (par défaut)
- Ignoré par Git: `backend/storage/`

Endpoints
- `GET /projects/:projectId/files` → liste (avec version courante)
- `POST /projects/:projectId/files` (form-data: `file`, `name?`, `note?`) → crée fichier (ou nouvelle version si nom existant)
- `GET /files/:fileId/versions` → historique des versions
- `POST /files/:fileId/versions` (form-data `file`) → nouvelle version
- `GET /files/:fileId/download?version=` → téléchargement

Notes
- Hash SHA-256 stocké par version; nom de fichier sécurisé côté disque
- Vérification multi-tenant: projet doit appartenir à l’organisation courante

