DNS

Sources de vérité (Phase 0)
- Backend Fly (app): btpgo-api → URL: https://btpgo-api.fly.dev
- Domaine API: api.msmarrakech.com → CNAME btpgo-api.fly.dev (DNS only “nuage gris” tant que le certificat n’est pas Ready)
- IA Fly (app): btpgo-ai → URL: https://btpgo-ai.fly.dev
- Domaine IA: ai.msmarrakech.com → CNAME btpgo-ai.fly.dev (DNS only)
- Front (o2switch): www.msmarrakech.com → A/AAAA vers IP o2switch (apex msmarrakech.com idem si souhaité)
- FRONTEND_URL_PROD (secret GitHub → injecté en FRONTEND_URL côté Fly): https://www.msmarrakech.com

Étapes
1) DNS provider
   - api.msmarrakech.com → CNAME btpgo-api.fly.dev (Proxy désactivé/DNS only)
   - ai.msmarrakech.com → CNAME btpgo-ai.fly.dev (Proxy désactivé)
   - www.msmarrakech.com (+ apex) → A/AAAA o2switch; activer AutoSSL
2) Certificats Fly.io
   - flyctl certs add api.msmarrakech.com -a btpgo-api
   - flyctl certs add ai.msmarrakech.com -a btpgo-ai
   - Vérifier: flyctl certs list/show -a <app>
3) Vérif HTTP(S)
   - https://api.msmarrakech.com/health → 200
   - https://api.msmarrakech.com/metrics → OK
   - https://www.msmarrakech.com → front OK; appels API → https://api.msmarrakech.com
