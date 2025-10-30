Abonnements

Models
- SubscriptionPlan (name, price, interval, features)
- Subscription (orgId, planId, status, currentPeriodEnd)

Endpoints
- `GET /subscriptions/plans`, `POST /subscriptions/plans`
- `POST /subscriptions/subscribe`, `GET /subscriptions/me`

Extensions
- Intégration Stripe (checkout, webhooks), quotas par plan

