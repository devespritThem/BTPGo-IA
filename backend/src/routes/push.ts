import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

router.post('/push/subscribe', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { endpoint, keys } = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).parse(req.body);
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: (req as any).user?.id ?? null, orgId: (req as any).orgId },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: (req as any).user?.id ?? null, orgId: (req as any).orgId },
    });
    res.status(201).json(sub);
  } catch (e) { next(e); }
});

export default router;

