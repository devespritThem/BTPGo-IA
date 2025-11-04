import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

let appVersion = 'unknown';
try {
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  appVersion = pkg?.default?.version || 'unknown';
} catch {}

const router = express.Router();

// GET /test/ping – simple liveness with version/build
router.get('/test/ping', (_req, res) => {
  const buildId = process.env.BUILD_ID || process.env.GIT_SHA || null;
  res.json({ ok: true, now: new Date().toISOString(), version: appVersion, buildId });
});

// GET /test/db – quick DB connectivity
router.get('/test/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'db_unreachable', detail: e?.message || String(e) });
  }
});

// GET /test/ai – call AI_ENGINE_URL/health and relay status
router.get('/test/ai', async (_req, res) => {
  try {
    const base = process.env.AI_ENGINE_URL || '';
    if (!base) return res.status(400).json({ ok: false, error: 'ai_url_missing' });
    const url = String(base).replace(/\/$/, '') + '/health';
    const r = await fetch(url, { method: 'GET' });
    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await r.json().catch(()=> ({})) : await r.text().catch(()=> '');
    res.status(200).json({ ok: r.ok, status: r.status, url, body });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ai_check_failed', detail: e?.message || String(e) });
  }
});

// GET /test/env – non-sensitive env snapshot for diagnostics
router.get('/test/env', (_req, res) => {
  const mask = (v) => (v ? (String(v).length > 4 ? String(v).slice(0, 2) + '***' : '***') : null);
  res.json({
    NODE_ENV: process.env.NODE_ENV || null,
    PORT: process.env.PORT || null,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME || null,
    AI_ENGINE_URL: process.env.AI_ENGINE_URL || null,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    HAS_DATA_KEY: !!process.env.DATA_ENCRYPTION_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL || process.env.FRONTEND_URL_PROD || null,
    BUILD_ID: process.env.BUILD_ID || process.env.GIT_SHA || null,
  });
});

// POST /test/create-demo-user - crée ou met à jour un utilisateur de démo
// Sécurisé via en-tête X-Test-Admin-Key qui doit correspondre à process.env.TEST_ADMIN_KEY
router.post('/test/create-demo-user', async (req, res) => {
  try {
    const key = req.headers['x-test-admin-key'];
    const expected = process.env.TEST_ADMIN_KEY || '';
    if (!expected || !key || String(key) !== expected) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const email = (req.body?.email || 'demo@msmarrakech.com').toLowerCase();
    const password = req.body?.password || 'Demo2025!';

    let user = await prisma.user.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!user) {
      user = await prisma.user.create({ data: { email, passwordHash } });
    } else {
      // met à jour le hash pour garantir le mot de passe connu
      user = await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '1h' });
    res.status(200).json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, accessToken: token });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'create_demo_failed', detail: e?.message || String(e) });
  }
});

export default router;
