import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

function cuid() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const ts = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 16; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `c_${ts}_${rand}`;
}

const router = express.Router();

// Helper to parse orgId from header
function getOrgId(req) {
  try { return (req.headers['x-org-id'] || '').toString(); } catch { return ''; }
}

// POST /ingest/document { title, type, url, projectId }
router.post('/ingest/document', async (req, res) => {
  try {
    const orgId = getOrgId(req) || null;
    const { title, type, url, projectId } = req.body || {};
    if (!title) return res.status(400).json({ error: 'missing_title' });
    const id = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "Document" (id, orgId, projectId, title, type, url) VALUES ($1,$2,$3,$4,$5,$6)',
      id, orgId, projectId || null, String(title), (type ? String(type) : 'other'), url || null
    );
    const evtId = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "Event" (id, orgId, type, refId, payload) VALUES ($1,$2,$3,$4,$5)',
      evtId, orgId, 'DocumentUploaded', id, { title, type, url }
    );
    const taskId = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AiTask" (id, orgId, type, refId, status, attempts) VALUES ($1,$2,$3,$4,$5,$6)',
      taskId, orgId, 'extract_document', id, 'pending', 0
    );
    res.status(201).json({ id, taskId });
  } catch (e) {
    res.status(500).json({ error: 'ingest_document_failed', detail: e?.message || String(e) });
  }
});

// POST /ingest/photo { url, projectId }
router.post('/ingest/photo', async (req, res) => {
  try {
    const orgId = getOrgId(req) || null;
    const { url, projectId } = req.body || {};
    if (!url) return res.status(400).json({ error: 'missing_url' });
    const id = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "Photo" (id, orgId, projectId, url) VALUES ($1,$2,$3,$4)',
      id, orgId, projectId || null, String(url)
    );
    const evtId = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "Event" (id, orgId, type, refId, payload) VALUES ($1,$2,$3,$4,$5)',
      evtId, orgId, 'PhotoUploaded', id, { url }
    );
    const taskId = cuid();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AiTask" (id, orgId, type, refId, status, attempts) VALUES ($1,$2,$3,$4,$5,$6)',
      taskId, orgId, 'tag_photo', id, 'pending', 0
    );
    res.status(201).json({ id, taskId });
  } catch (e) {
    res.status(500).json({ error: 'ingest_photo_failed', detail: e?.message || String(e) });
  }
});

// GET /documents - list latest
router.get('/documents', async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT id, title, type, url, projectId, createdAt FROM "Document" ORDER BY createdAt DESC NULLS LAST LIMIT 100');
    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: 'documents_list_failed' }); }
});

// GET /photos - list latest
router.get('/photos', async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT id, url, projectId, labels, createdAt FROM "Photo" ORDER BY createdAt DESC NULLS LAST LIMIT 100');
    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: 'photos_list_failed' }); }
});

export default router;

