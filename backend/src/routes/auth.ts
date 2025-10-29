import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import * as totp from 'speakeasy';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../lib/token.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({ data: { email: body.email, passwordHash, name: body.name ?? null } });
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.twoFactorEnabled) {
      return res.json({ requires2FA: true, userId: user.id });
    }
    // choose first org if any or create personal org
    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
    let orgId = membership?.orgId;
    if (!orgId) {
      const org = await prisma.organization.create({ data: { name: user.name ? `${user.name}'s org` : 'My org', members: { create: { userId: user.id, role: 'owner' } } } });
      orgId = org.id;
    }
    const accessToken = signAccessToken({ id: user.id, email: user.email }, orgId);
    const refreshToken = await issueRefreshToken(user.id, orgId, req.ip);
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name }, orgId });
  } catch (err) {
    next(err);
  }
});

// Register org + owner user in one call
const registerOrgSchema = z.object({ orgName: z.string().min(1), email: z.string().email(), password: z.string().min(8), name: z.string().optional() });
router.post('/register-org', async (req, res, next) => {
  try {
    const body = registerOrgSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(body.password, 10);
    const org = await prisma.organization.create({ data: { name: body.orgName } });
    const user = await prisma.user.create({ data: { email: body.email, passwordHash, name: body.name ?? null, memberships: { create: { orgId: org.id, role: 'owner' } } } });
    const accessToken = signAccessToken({ id: user.id, email: user.email }, org.id);
    const refreshToken = await issueRefreshToken(user.id, org.id, req.ip);
    res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name }, orgId: org.id });
  } catch (err) { next(err); }
});

// 2FA (TOTP)
router.post('/2fa/setup', async (req, res, next) => {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const secret = totp.generateSecret({ length: 20, name: `BTPGo:${user.email}` });
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret.base32 } });
    res.json({ otpauthUrl: secret.otpauth_url, base32: secret.base32 });
  } catch (err) { next(err); }
});

router.post('/2fa/enable', async (req, res, next) => {
  try {
    const { userId, code } = z.object({ userId: z.string(), code: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return res.status(400).json({ error: '2FA not set up' });
    const verified = totp.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(401).json({ error: 'Invalid code' });
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    res.json({ enabled: true });
  } catch (err) { next(err); }
});

router.post('/2fa/login', async (req, res, next) => {
  try {
    const { userId, code } = z.object({ userId: z.string(), code: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ error: '2FA not enabled' });
    const verified = totp.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(401).json({ error: 'Invalid code' });
    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
    let orgId = membership?.orgId;
    if (!orgId) {
      const org = await prisma.organization.create({ data: { name: user.name ? `${user.name}'s org` : 'My org', members: { create: { userId: user.id, role: 'owner' } } } });
      orgId = org.id;
    }
    const accessToken = signAccessToken({ id: user.id, email: user.email }, orgId);
    const refreshToken = await issueRefreshToken(user.id, orgId, req.ip);
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name }, orgId });
  } catch (err) { next(err); }
});

// Token rotation
router.post('/token/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const { newValue, userId, orgId } = await rotateRefreshToken(refreshToken, req.ip);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const accessToken = signAccessToken({ id: user.id, email: user.email }, orgId);
    res.json({ accessToken, refreshToken: newValue });
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
