-- Notifications and Preferences

CREATE TABLE IF NOT EXISTS "Notification" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  userId TEXT,
  module TEXT,    -- alert | decision | system
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  severity TEXT,  -- info | warning | critical
  readAt TIMESTAMP(3),
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_org_created_idx" ON "Notification" (orgId, createdAt DESC);

CREATE TABLE IF NOT EXISTS "Preference" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  channels JSONB,   -- { in_app: true, email: true, push: false }
  digest TEXT,      -- off | daily | weekly
  muted JSONB,      -- { modules: [...], types: [...] }
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

