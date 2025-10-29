-- Multi-tenant schema: Org, UserOrg, orgId on business tables, unique constraints

CREATE TABLE IF NOT EXISTS "Org" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "UserOrg" (
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "orgId"),
  CONSTRAINT "UserOrg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserOrg_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultOrgId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_defaultOrg_fkey" FOREIGN KEY ("defaultOrgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Marche" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
ALTER TABLE "Marche" ADD CONSTRAINT "Marche_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Marche_org_idx" ON "Marche" ("orgId");

ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Devis_org_idx" ON "Devis" ("orgId");
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Devis_ref_org_unique'
  ) THEN
    CREATE UNIQUE INDEX "Devis_ref_org_unique" ON "Devis" ("ref", "orgId");
  END IF;
END $$;

ALTER TABLE "Chantier" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
ALTER TABLE "Chantier" ADD CONSTRAINT "Chantier_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Chantier_org_idx" ON "Chantier" ("orgId");

