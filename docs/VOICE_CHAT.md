Assistant IA vocal & textuel

Text
- `POST /assistant/text { text, targetLang? }` → detect_lang + summarize (+translate placeholder)

Voice
- `POST /assistant/voice` (form-data `audio=@file.wav`) → transcribe (placeholder) + summarize
- AI Engine endpoints: `/voice/transcribe`, `/nlp/summarize`, `/nlp/detect_lang`, `/nlp/translate`

Chat collaboratif
- Sessions: `POST/GET /chat/sessions`, `POST /chat/sessions/:id/members`
- Messages: `GET/POST /chat/sessions/:id/messages`
- Réponse assistant: basée sur `/analytics/ask` (intents cashflow/marge/risque/impayés)

Multilingue
- Détection heuristique FR/AR/EN côté IA Engine (placeholder)
- Intégration MT réelle (ex: provider externe) possible en branchant `/nlp/translate`

