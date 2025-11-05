import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-change-me' : '');

function verifyToken(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing_token' });
    if (!JWT_SECRET) return res.status(500).json({ error: 'server_misconfig' });
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function cuid() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const ts = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 16; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `c_${ts}_${rand}`;
}

const router = express.Router();

// Map "Projects" to existing table Marche for demo/POC
// GET /projects - list
router.get('/projects', verifyToken, async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT id, title, status, createdAt FROM "Marche" ORDER BY createdAt DESC NULLS LAST LIMIT 100');
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: 'projects_list_failed', detail: e?.message || String(e) });
  }
});

// POST /projects - create
router.post('/projects', verifyToken, async (req, res) => {
  try {
    const { title, status } = req.body || {};
    if (!title) return res.status(400).json({ error: 'missing_title' });
    const id = cuid();
    await prisma.$executeRawUnsafe('INSERT INTO "Marche" (id, title, status) VALUES ($1,$2,$3)', id, String(title), status ? String(status) : 'draft');
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: 'projects_create_failed', detail: e?.message || String(e) });
  }
});

// GET /projects/:id - detail
router.get('/projects/:id', verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const rows = await prisma.$queryRawUnsafe('SELECT id, title, status, createdAt FROM "Marche" WHERE id = $1', id);
    const row = Array.isArray(rows) && rows[0];
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ item: row });
  } catch (e) {
    res.status(500).json({ error: 'projects_detail_failed', detail: e?.message || String(e) });
  }
});

export default router;

