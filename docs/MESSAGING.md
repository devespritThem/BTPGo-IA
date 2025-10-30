Messagerie par projet + IA de résumé

Modèle
- `ProjectMessage { id, projectId, authorId?, content, createdAt }`

Endpoints
- `GET /projects/:projectId/messages?skip=&take=` → liste chronologique
- `POST /projects/:projectId/messages { content }` → ajoute un message (scopé org)
- `GET /projects/:projectId/messages/summary?since=&lang=` → résumé IA (multilingue)

Résumé IA
- Concatène les messages (max ~8k chars) et appelle AI Engine `/nlp/summarize`
- Option `lang` → passe via `/nlp/translate` (stub) pour FR/AR/EN

Idées UI
- Fil de discussion par projet avec badge “Résumé” (depuis date X)
- Marquer les décisions/action items, générer to‑do auto

