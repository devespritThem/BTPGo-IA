Modules (détaillés)

Auth & Multi‑tenant
- Organisations, Membership (owner/admin/member)
- JWT court (15m) + Refresh rotatif (DB), 2FA TOTP
- Endpoints: `/auth/*`, header `X-Org-Id`

Projets & Gantt
- Projets CRUD, tâches Gantt + dépendances
- IA Planification/Forecast (météo/ressources) via AI Engine
- Endpoints: `/projects`, `/gantt/*`

Finance & Comptabilité
- Clients/Fournisseurs, Factures (lignes + taxes), Dépenses
- Paiements (balance/état), Recettes hors facture
- Cashflow mensuel, Profitabilité globale/projet
- Endpoints: `/finance/*`

IA & OCR Appels d’offres
- Upload PDF/images → OCR (pdfplumber/pytesseract) + heuristiques extraction
- Similarité AO (shingles/Jaccard) → alertes
- Endpoints: `/tenders/extract`, `/tenders/store`, `/tenders/similar`

RH & Matériel
- Employés (QR), pointage (checkin/out), équipements + logs
- Vision QR via OpenCV (AI Engine)
- Endpoints: `/hr/*`, `/vision/*`

Marketplace
- Listings, candidatures, commissions, matching simple
- Endpoints: `/marketplace/*`

Financement & Assurance
- Dossiers financement/assurance avec score/risque simples
- Endpoints: `/finance/apply`, `/insurance/apply`

Maintenance & Satisfaction
- Tickets, garanties, enquêtes (NPS/CSAT)
- Endpoints: `/maintenance/*`

Abonnements
- Plans, souscriptions, période courante
- Endpoints: `/subscriptions/*`

ESG / Carbone
- Facteurs d’émission, enregistrements projet, recommandations
- Endpoints: `/esg/*`

Fichiers (versioning)
- ProjectFile + FileVersion, hash SHA‑256, téléchargements versionnés
- Endpoints: `/projects/:id/files`, `/files/*`

Analytics & Dashboards
- KPIs (revenue, cashIn, cost, marge, impayés)
- Projets (marge/risk), Chat “Ask your data”
- Endpoints: `/analytics/*`

Assistant & Messagerie
- Assistant texte/vocal (transcription/résumé/translation stubs)
- Chat collaboratif (sessions, membres, messages)
- Project messaging + résumé IA
- Endpoints: `/assistant/*`, `/chat/*`, `/projects/:id/messages*`

