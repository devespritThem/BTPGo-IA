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
    req.user = payload; next();
  } catch { return res.status(401).json({ error: 'invalid_token' }); }
}

const router = express.Router();

// GET /notifications?limit=50&unread=1
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const onlyUnread = String(req.query.unread || '').toLowerCase();
    let sql = 'SELECT id, orgId, userId, module, type, title, message, data, severity, readAt, createdAt FROM "Notification" WHERE 1=1';
    const params = [];
    if (onlyUnread === '1' || onlyUnread === 'true') sql += ' AND readAt IS NULL';
    sql += ' ORDER BY createdAt DESC NULLS LAST LIMIT ' + limit;
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    res.json({ items: rows });
  } catch { res.status(500).json({ error: 'notifications_list_failed' }); }
});

// POST /notifications/read { ids: [] }
router.post('/notifications/read', verifyToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    for (const id of ids) {
      await prisma.$executeRawUnsafe('UPDATE "Notification" SET readAt = NOW() WHERE id = $1', String(id));
    }
    res.json({ ok: true, count: ids.length });
  } catch { res.status(500).json({ error: 'notifications_read_failed' }); }
});

// POST /notifications/read_all
router.post('/notifications/read_all', verifyToken, async (_req, res) => {
  try {
    await prisma.$executeRawUnsafe('UPDATE "Notification" SET readAt = NOW() WHERE readAt IS NULL');
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'notifications_read_all_failed' }); }
});

export default router;

