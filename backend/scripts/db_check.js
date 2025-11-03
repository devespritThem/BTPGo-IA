// Quick DB connectivity check from within the container/machine
// Usage:
//   node scripts/db_check.js
// Exits 0 on success, 1 on failure.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || "";
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connection OK");
    process.exit(0);
  } catch (e) {
    console.error("DB connection FAILED:", e?.message || e);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }
}

main();

