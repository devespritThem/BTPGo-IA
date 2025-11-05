-- Ingestion & AI bus schema (MVP, JSON-centric)

-- Document storage (metadata)
CREATE TABLE IF NOT EXISTS "Document" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  projectId TEXT,
  title TEXT NOT NULL,
  type TEXT,
  url TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Document_org_created_idx" ON "Document" (orgId, createdAt DESC);

-- Photo storage (metadata)
CREATE TABLE IF NOT EXISTS "Photo" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  projectId TEXT,
  url TEXT NOT NULL,
  labels JSONB,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Photo_org_created_idx" ON "Photo" (orgId, createdAt DESC);

-- Extracted structured data
CREATE TABLE IF NOT EXISTS "Extract" (
  id TEXT PRIMARY KEY,
  sourceType TEXT NOT NULL, -- 'document' | 'photo'
  sourceId TEXT NOT NULL,
  json JSONB,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Extract_source_idx" ON "Extract" (sourceType, sourceId);

-- Embeddings (JSON array MVP; switch to pgvector later)
CREATE TABLE IF NOT EXISTS "Embedding" (
  id TEXT PRIMARY KEY,
  sourceType TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  vector JSONB,
  dim INTEGER,
  model TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Embedding_source_idx" ON "Embedding" (sourceType, sourceId);

-- Business events (bus log)
CREATE TABLE IF NOT EXISTS "Event" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  type TEXT NOT NULL,
  refId TEXT,
  payload JSONB,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Event_org_type_created_idx" ON "Event" (orgId, type, createdAt DESC);

-- AI Task queue
CREATE TABLE IF NOT EXISTS "AiTask" (
  id TEXT PRIMARY KEY,
  orgId TEXT,
  type TEXT NOT NULL,   -- 'extract_document' | 'tag_photo' | ...
  refId TEXT NOT NULL,  -- points to Document.id or Photo.id
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | error
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AiTask_status_created_idx" ON "AiTask" (status, createdAt);

