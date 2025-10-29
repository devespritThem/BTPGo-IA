import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL_MS = Number(process.env.REFRESH_TTL_MS || 1000 * 60 * 60 * 24 * 7); // 7 days

export function signAccessToken(user: { id: string; email: string }, orgId: string) {
  const secret = process.env.JWT_SECRET || 'changeme';
  const payload = { sub: user.id, email: user.email, orgId };
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TTL });
}

export function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueRefreshToken(userId: string, orgId: string, createdByIp?: string) {
  const value = generateRefreshTokenValue();
  const tokenHash = hashToken(value);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await prisma.refreshToken.create({ data: { userId, orgId, tokenHash, expiresAt, createdByIp } });
  return value;
}

export async function rotateRefreshToken(oldValue: string, createdByIp?: string) {
  const oldHash = hashToken(oldValue);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash: oldHash, revokedAt: null } });
  if (!existing) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  if (existing.expiresAt < new Date()) throw Object.assign(new Error('Expired refresh token'), { status: 401 });
  const newValue = generateRefreshTokenValue();
  const newHash = hashToken(newValue);
  const newToken = await prisma.refreshToken.create({ data: { userId: existing.userId, orgId: existing.orgId, tokenHash: newHash, expiresAt: existing.expiresAt, createdByIp } });
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date(), replacedById: newToken.id } });
  return { newValue, userId: existing.userId, orgId: existing.orgId };
}

export async function revokeRefreshToken(value: string) {
  const hash = hashToken(value);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash: hash, revokedAt: null } });
  if (!existing) return;
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
}

