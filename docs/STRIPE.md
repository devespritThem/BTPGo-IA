#+ Stripe Billing - Configuration & Test

## Secrets à configurer (prod)
- `STRIPE_SECRET_KEY`: clé secrète Stripe (Commence par `sk_live_` en prod)
- `STRIPE_WEBHOOK_SECRET`: secret de l'endpoint webhook
- `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`: IDs de prix (ex: `price_...`)
- `BILLING_SUCCESS_URL`: ex `https://msmarrakech.com/billing/success`
- `BILLING_CANCEL_URL`: ex `https://msmarrakech.com/billing/cancel`

Placer ces valeurs dans:
- Secrets GitHub (déploiement Fly) et/ou variables runtime Fly.
- `.env` local si vous testez en local.

## Dashboard Stripe
1. Créer Produit(s) + Prix (Starter, Pro) → copier les `price_...`.
2. Créer un endpoint Webhook (prod) → URL: `https://api.msmarrakech.com/billing/webhook`
3. Copier le secret du webhook.

## Endpoints Backend
- `POST /billing/checkout` (admin org):
  - Body: `{ "plan": "starter" | "pro", "seats": 1 }`
  - Réponse: `{ url }` à ouvrir dans le navigateur
- `GET /billing/portal` (admin org):
  - Réponse: `{ url }` vers le portail client Stripe
- `POST /billing/webhook`:
  - Stripe enverra les événements (checkout.session.completed, customer.subscription.*)

Notes:
- Le webhook est défini avant `express.json()` et utilise `express.raw()`.
- Les abonnements sont stockés dans la table `Subscription` (orgId unique).

## Test local (dev)
- Checkout:
```
curl -X POST http://localhost:4000/billing/checkout \
 -H "Authorization: Bearer <JWT_ADMIN>" \
 -H "x-org-id: <ORG_ID>" \
 -H "Content-Type: application/json" \
 -d '{"plan":"starter","seats":3}'
```
- Portal:
```
curl "http://localhost:4000/billing/portal" \
 -H "Authorization: Bearer <JWT_ADMIN>" \
 -H "x-org-id: <ORG_ID>"
```

## Frontend - Pages de retour
- `/billing/success` et `/billing/cancel` existent dans le frontend (React Router).

