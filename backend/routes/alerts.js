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

// GET /alerts?projectId=&type=&severity=&openOnly=1
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const projectId = (req.query.projectId || '').toString() || null;
    const type = (req.query.type || '').toString() || null;
    const severity = (req.query.severity || '').toString() || null;
    const openOnly = String(req.query.openOnly || '').toLowerCase();
    let sql = 'SELECT id, orgId, projectId, type, severity, title, message, data, createdAt, resolvedAt FROM "Alert" WHERE 1=1';
    const params = [];
    if (projectId) { params.push(projectId); sql += ` AND projectId = $${params.length}`; }
    if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
    if (severity) { params.push(severity); sql += ` AND severity = $${params.length}`; }
    if (openOnly === '1' || openOnly === 'true') { sql += ' AND resolvedAt IS NULL'; }
    sql += ' ORDER BY createdAt DESC NULLS LAST LIMIT 200';
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    res.json({ items: rows });
  } catch { res.status(500).json({ error: 'alerts_list_failed' }); }
});

export default router;

