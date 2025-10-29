API Overview (grouped)

Public
- GET `/health` – Health check

Auth & Tenant
- POST `/auth/register`, `/auth/login`, `/auth/register-org`
- 2FA: POST `/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/login`
- Tokens: POST `/auth/token/refresh`, `/auth/logout`

Projects & Gantt
- GET/POST `/projects`, GET/PATCH/DELETE `/projects/:id`
- Gantt: GET/POST `/gantt/projects/:projectId/tasks`, POST `/gantt/schedule`, `/gantt/forecast`

Messaging & Files
- Project messages: GET/POST `/projects/:projectId/messages`, GET `/projects/:id/messages/summary`
- Files: GET/POST `/projects/:id/files`, GET `/files/:fileId/versions`, POST `/files/:fileId/versions`, GET `/files/:fileId/download`

Finance & Accounting
- Customers: GET/POST `/finance/customers`; Suppliers: GET/POST `/finance/suppliers`
- Invoices: POST `/finance/invoices`, GET `/finance/invoices/:id`
- Payments: GET/POST `/finance/invoices/:id/payments`
- Receipts: GET/POST `/finance/receipts`
- Cashflow: GET `/finance/cashflow?from&to`
- Profitability: GET `/finance/analytics/profitability`

AI & Insights
- AI proxy: POST `/ai/estimate`
- Tenders OCR: POST `/tenders/extract`
- Vision QR: POST `/vision/qr/scan`
- Analytics: GET `/analytics/dashboard`, GET `/analytics/projects`, POST `/analytics/ask`

Marketplace & Partnerships
- Listings: GET/POST `/marketplace/listings`
- Apply: POST `/marketplace/apply`, Accept: POST `/marketplace/applications/:id/accept`
- Matching: GET `/marketplace/match`

Financing & Insurance
- Finance: POST `/finance/apply`, Insurance: POST `/insurance/apply`

Maintenance & Satisfaction
- Tickets: POST/GET `/maintenance/tickets`, POST `/maintenance/tickets/:id/close`
- Warranties: POST/GET `/maintenance/warranties`
- Surveys: POST/GET `/maintenance/surveys`

Subscriptions
- Plans: GET/POST `/subscriptions/plans`, Subscribe: POST `/subscriptions/subscribe`, Mine: GET `/subscriptions/me`

ESG
- Factors: POST/GET `/esg/factors`
- Emissions: POST `/esg/projects/emissions`, GET `/esg/projects/:projectId/emissions`, GET `/esg/projects/:projectId/recommendations`

Assistant & Chat
- Assistant: POST `/assistant/text`, `/assistant/voice`
- Chat: POST/GET `/chat/sessions`, POST `/chat/sessions/:id/members`, GET/POST `/chat/sessions/:id/messages`

Security & Audit
- GET `/security/audit`, GET `/security/anomalies`

Monitoring
- GET `/metrics` (Prometheus text format)

