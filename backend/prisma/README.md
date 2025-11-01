Prisma setup for BTPGo (Fly.io + Supabase)

Quick commands
- Generate client: `npx prisma generate`
- Deploy migrations: `npx prisma migrate deploy`
- Seed data (optional): `node seed.js` or `npx ts-node prisma/seed.ts`

Environment
- Uses `DATABASE_URL` from env (Fly secrets or local `.env`).
- For Supabase, use the Postgres connection string. For long‑lived pools, prefer the non‑pooler URL when running migrations.

Fly.io
- `fly.toml` defines `release_command = "sh -lc 'npx prisma migrate deploy'"` so migrations run automatically on deploy.

Notes
- Prisma version: 5.22+
- Node: 20+
