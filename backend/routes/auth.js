import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const router = express.Router();

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const ttl = process.env.ACCESS_TTL || '1h';
  return jwt.sign(payload, secret, { expiresIn: ttl });
}

function verifyToken(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing_token' });
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const payload = jwt.verify(m[1], secret);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// POST /auth/register
router.post('/auth/register', async (req, res) => {
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
router.post('/auth/register-org', async (req, res) => {
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
router.post('/auth/login', async (req, res) => {
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

export default router;
