-- Drop single-column unique on Devis.ref to allow org-scoped uniqueness
DO $$ BEGIN
  ALTER TABLE "Devis" DROP CONSTRAINT IF EXISTS "Devis_ref_key";
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

-- Ensure composite unique exists (ref, orgId)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Devis_ref_org_unique'
  ) THEN
    CREATE UNIQUE INDEX "Devis_ref_org_unique" ON "Devis" ("ref", "orgId");
  END IF;
END $$;

