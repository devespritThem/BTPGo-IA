-- Alerts and Decisions core schema

CREATE TABLE IF NOT EXISTS "Alert" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  projectId TEXT,
  type TEXT,
  severity TEXT, -- info | warning | critical
  title TEXT,
  message TEXT,
  data JSONB,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "Alert_proj_sev_created_idx" ON "Alert" (projectId, severity, createdAt DESC);

CREATE TABLE IF NOT EXISTS "Decision" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  projectId TEXT,
  module TEXT,   -- project | rh | finance | planning | documents | photos
  action TEXT,   -- reschedule_task | adjust_unit_price | reassign_worker ...
  target JSONB,  -- { type, id }
  payload JSONB, -- suggestion details
  confidence DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed | accepted | applied | rejected | expired
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decidedAt TIMESTAMP(3),
  decidedBy TEXT
);
CREATE INDEX IF NOT EXISTS "Decision_proj_status_created_idx" ON "Decision" (projectId, status, createdAt DESC);

