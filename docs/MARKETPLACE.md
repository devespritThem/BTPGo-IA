Marketplace BTPGo

Objects
- Listings: demands/offers (title, desc, category, tags, prices)
- Applications: candidatures (pending/accepted/rejected)
- Commissions: % de mise en relation (par défaut 5%)

Endpoints
- `POST /marketplace/listings`, `GET /marketplace/listings`
- `POST /marketplace/apply` (appliquer à une annonce)
- `POST /marketplace/applications/:id/accept` (génère commission)
- `GET /marketplace/match` (suggestions simples)

Extensions
- Notations, filtres géographiques, vérification KYC/assurance
- Paiement de commission (Stripe) et facturation

