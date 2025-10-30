import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

router.get('/plans', async (_req, res, next) => {
  try { res.json(await prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } })); } catch (e) { next(e); }
});

const planSchema = z.object({ name: z.string().min(1), price: z.number().nonnegative(), interval: z.enum(['month','year']).default('month'), features: z.any().optional() });
router.post('/plans', requireAuth, async (req, res, next) => {
  try { const p = await prisma.subscriptionPlan.create({ data: planSchema.parse(req.body) as any }); res.status(201).json(p); } catch (e) { next(e); }
});

router.post('/subscribe', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { planId } = z.object({ planId: z.string() }).parse(req.body);
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const now = new Date();
    const end = new Date(now);
    if (plan.interval === 'year') end.setFullYear(end.getFullYear()+1); else end.setMonth(end.getMonth()+1);
    const sub = await prisma.subscription.create({ data: { orgId: (req as any).orgId, planId: plan.id, currentPeriodEnd: end, status: 'active' } });
    res.status(201).json(sub);
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.subscription.findMany({ where: { orgId: (req as any).orgId }, include: { plan: true } })); } catch (e) { next(e); }
});

export default router;

