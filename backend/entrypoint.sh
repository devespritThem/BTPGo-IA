#!/bin/sh
set -eu

if [ "${MIGRATE_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma generate >/dev/null 2>&1 || true
  # Tolerate database unavailability at boot (do not crash container)
  npx prisma migrate deploy || echo "WARN Prisma migrate failed, continuing"
else
  echo "[entrypoint] Skipping migrations (MIGRATE_ON_START=false)"
fi

if [ "${SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node seed.js || true
fi

echo "[entrypoint] Starting API"
exec node index.js
