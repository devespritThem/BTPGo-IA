CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL UNIQUE,
  "customerId" TEXT,
  "subscriptionId" TEXT UNIQUE,
  "plan" TEXT,
  "status" TEXT,
  "seats" INTEGER DEFAULT 1,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Subscription_sub_idx" ON "Subscription" ("subscriptionId");

