BIM / Métré IA

Architecture
- Frontend (web): IFC.js pour lecture IFC, calcul locaux (surfaces/volumes) → envoi JSON au backend
- Backend: stocke `BimModel` + `BimMeasurement` et exporte PDF/Excel

Endpoints (backend)
- `POST /bim/models` { projectId, name, version?, measurements[] }
- `GET /bim/models/:id/summary`
- `POST /bim/models/:id/export/pdf|excel` (fichiers)

Notes
- Parsing IFC côté navigateur via IFC.js (WebAssembly)
- Back-office peut accepter également des métrés provenant d’autres outils

