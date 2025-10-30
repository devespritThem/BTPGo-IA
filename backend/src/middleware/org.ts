import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth.js';
import { prisma } from '../lib/prisma.js';

export async function orgContext(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const headerOrgId = (req.headers['x-org-id'] as string) || (req as any).user?.orgId;
    if (!req.user) return next();
    let orgId = headerOrgId;
    if (!orgId) {
      const membership = await prisma.membership.findFirst({ where: { userId: req.user.id } });
      orgId = membership?.orgId;
    }
    (req as any).orgId = orgId;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireOrg(req: AuthRequest, res: Response, next: NextFunction) {
  const orgId = (req as any).orgId;
  if (!orgId) return res.status(400).json({ error: 'Missing org context' });
  next();
}

