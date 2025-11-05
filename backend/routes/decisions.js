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

// GET /decisions?projectId=&status=&module=
router.get('/decisions', verifyToken, async (req, res) => {
  try {
    const projectId = (req.query.projectId || '').toString() || null;
    const status = (req.query.status || '').toString() || null;
    const moduleName = (req.query.module || '').toString() || null;
    let sql = 'SELECT id, orgId, projectId, module, action, target, payload, confidence, status, createdAt, decidedAt, decidedBy FROM "Decision" WHERE 1=1';
    const params = [];
    if (projectId) { params.push(projectId); sql += ` AND projectId = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (moduleName) { params.push(moduleName); sql += ` AND module = $${params.length}`; }
    sql += ' ORDER BY createdAt DESC NULLS LAST LIMIT 200';
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: 'decisions_list_failed' }); }
});

async function setDecisionStatus(id, status, userEmail) {
  await prisma.$executeRawUnsafe('UPDATE "Decision" SET status=$2, decidedAt=NOW(), decidedBy=$3 WHERE id=$1', id, status, userEmail || null);
}

router.post('/decisions/:id/accept', verifyToken, async (req, res) => {
  try { await setDecisionStatus(String(req.params.id||''), 'accepted', req.user?.email); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'accept_failed' }); }
});

router.post('/decisions/:id/reject', verifyToken, async (req, res) => {
  try { await setDecisionStatus(String(req.params.id||''), 'rejected', req.user?.email); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'reject_failed' }); }
});

router.post('/decisions/:id/apply', verifyToken, async (req, res) => {
  try {
    // TODO: apply the action to the right module/table; MVP marks applied
    await setDecisionStatus(String(req.params.id||''), 'applied', req.user?.email);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'apply_failed' }); }
});

export default router;

