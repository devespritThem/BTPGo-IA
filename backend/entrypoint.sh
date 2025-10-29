#!/bin/sh
set -euo pipefail

if [ "${MIGRATE_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma generate >/dev/null 2>&1 || true
  npx prisma migrate deploy || {
    echo "[entrypoint] migrate deploy failed; attempting dev migration (dev only)";
    npx prisma migrate dev --name init || true;
  }
else
  echo "[entrypoint] Skipping migrations (MIGRATE_ON_START=false)"
fi

if [ "${SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node seed.js || true
fi

echo "[entrypoint] Starting API"
exec node index.js
