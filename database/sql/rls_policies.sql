-- Row Level Security policies for multi-tenant isolation
-- Requires application to set the session variable: SELECT set_config('app.org_id', '<org-uuid>', true);
-- Recommended: run inside a transaction per-request and use SET LOCAL for safety.

ALTER TABLE "Org" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserOrg" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Marche" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Devis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chantier" ENABLE ROW LEVEL SECURITY;

-- Org: restrict to current org
CREATE POLICY org_rls ON "Org"
  USING (id = current_setting('app.org_id', true)::text);

-- UserOrg: rows for current org
CREATE POLICY userorg_rls ON "UserOrg"
  USING ("orgId" = current_setting('app.org_id', true)::text);

-- Marche
CREATE POLICY marche_rls ON "Marche"
  USING ("orgId" = current_setting('app.org_id', true)::text);

-- Devis
CREATE POLICY devis_rls ON "Devis"
  USING ("orgId" = current_setting('app.org_id', true)::text);

-- Chantier
CREATE POLICY chantier_rls ON "Chantier"
  USING ("orgId" = current_setting('app.org_id', true)::text);

