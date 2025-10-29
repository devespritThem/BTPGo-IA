import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', async () => {
    try {
      if (req.method === 'GET') return; // only log mutating ops
      if (req.path.startsWith('/auth')) return; // skip auth secrets
      const user = (req as any).user as { id: string } | undefined;
      const orgId = (req as any).orgId as string | undefined;
      const maskedBody = { ...req.body };
      if (maskedBody.password) maskedBody.password = '***';
      await prisma.auditLog.create({ data: {
        userId: user?.id,
        orgId,
        action: `${req.method} ${req.path}`,
        metadata: { status: res.statusCode, ms: Date.now()-start, body: maskedBody }
      }});
    } catch {}
  });
  next();
}

