import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const router = express.Router();

// Enforce JWT secret: in production it must be provided via env
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-change-me' : '');

// --- Minimal in-memory rate limiter (per-process) ---
// Fixed window counters with auto-expiration; sufficient for single-instance
function createRateLimiter({ windowMs, limit, keyFn }) {
  const store = new Map(); // key -> { count, resetAt }
  function prune() {
    const now = Date.now();
    for (const [k, v] of store) { if (!v || v.resetAt <= now) store.delete(k); }
  }
  setInterval(prune, Math.max(1000, Math.floor(windowMs / 2))).unref?.();
  return function rateLimit(req, res, next) {
    try {
      const now = Date.now();
      const key = keyFn(req) || 'global';
      const rec = store.get(key);
      if (!rec || rec.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (rec.count < limit) { rec.count += 1; return next(); }
      const retry = Math.max(0, Math.ceil((rec.resetAt - now) / 1000));
      try { res.set('Retry-After', String(retry)); } catch {}
      return res.status(429).json({ error: 'rate_limited', retryAfter: retry });
    } catch {
      // On limiter failure, do not block auth flow
      return next();
    }
  };
}

// 5 login tentatives par 5 minutes par combinaison (ip + email)
const loginLimiter = createRateLimiter({
  windowMs: Number(process.env.LOGIN_WINDOW_MS || 5 * 60 * 1000),
  limit: Number(process.env.LOGIN_LIMIT || 5),
  keyFn: (req) => {
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip').toString();
    let email = '';
    try { email = (req.body?.email || '').toString().trim().toLowerCase(); } catch {}
    return `${ip}|${email}`;
  },
});

// 10 inscriptions par 10 minutes par IP
const registerLimiter = createRateLimiter({
  windowMs: Number(process.env.REGISTER_WINDOW_MS || 10 * 60 * 1000),
  limit: Number(process.env.REGISTER_LIMIT || 10),
  keyFn: (req) => (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip').toString(),
});

function signToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET missing');
  const ttl = process.env.ACCESS_TTL || '1h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ttl });
}

function verifyToken(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing_token' });
    if (!JWT_SECRET) return res.status(500).json({ error: 'server_misconfig' });
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// POST /auth/register
router.post('/auth/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'email_taken' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const accessToken = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken });
  } catch (e) {
    try { console.error('[auth.register] failed:', e?.message || e); } catch {}
    res.status(500).json({ error: 'register_failed', detail: e?.message || String(e) });
  }
});

// POST /auth/register-org - compat: crée un utilisateur sans organisation (placeholder)
router.post('/auth/register-org', registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'email_taken' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const accessToken = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken });
  } catch (e) {
    try { console.error('[auth.register-org] failed:', e?.message || e); } catch {}
    res.status(500).json({ error: 'register_failed', detail: e?.message || String(e) });
  }
});

// POST /auth/login
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const accessToken = signToken({ sub: user.id, email: user.email, role: user.role });
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken });
  } catch (e) {
    try { console.error('[auth.login] failed:', e?.message || e); } catch {}
    res.status(500).json({ error: 'login_failed', detail: e?.message || String(e) });
  }
});

// GET /auth/me (requires Authorization: Bearer <token>)
router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user.email } });
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'me_failed' });
  }
});

// Example protected route
router.get('/auth/ping', verifyToken, (_req, res) => res.json({ ok: true }));

// POST /auth/forgot (stub): always respond OK for now
router.post('/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing_email' });
    // TODO: generate token, send email; stub returns 200
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'forgot_failed' });
  }
});

export default router;
