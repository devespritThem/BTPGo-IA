Accounting & Cashflow

Endpoints (backend)
- Invoices payments: `GET/POST /finance/invoices/:id/payments`
- Receipts (non-invoiced income): `GET/POST /finance/receipts`
- Cashflow summary: `GET /finance/cashflow?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Profitability (org-wide): `GET /finance/analytics/profitability`

Models (Prisma)
- `Payment { id, invoiceId, amount, method, reference, date, orgId }`
- `Receipt { id, label, amount, date, projectId?, orgId }`

Notes
- Invoice status derived from payments: paid/partial/unpaid
- Cashflow aggregates monthly inflow (payments+receipts) and outflow (expenses)
- AI insights: AI Engine `POST /finance/insights` for narrative and actions

