import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

const ticketSchema = z.object({ title: z.string().min(1), description: z.string().optional(), projectId: z.string().optional(), priority: z.string().default('normal') });
router.post('/tickets', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = ticketSchema.parse(req.body); const t = await prisma.ticket.create({ data: { ...b, orgId: (req as any).orgId, status: 'open', createdById: (req as any).user?.id } as any }); res.status(201).json(t); } catch (e) { next(e); }
});
router.get('/tickets', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.ticket.findMany({ where: { orgId: (req as any).orgId } })); } catch (e) { next(e); }
});
router.post('/tickets/:id/close', requireAuth, requireOrg, async (req, res, next) => {
  try { const t = await prisma.ticket.update({ where: { id: req.params.id }, data: { status: 'closed', closedAt: new Date() } }); res.json(t); } catch (e) { next(e); }
});

const warrantySchema = z.object({ projectId: z.string().optional(), vendor: z.string().optional(), startDate: z.string().datetime(), endDate: z.string().datetime(), terms: z.string().optional() });
router.post('/warranties', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = warrantySchema.parse(req.body); const w = await prisma.warranty.create({ data: { ...b, orgId: (req as any).orgId, startDate: new Date(b.startDate), endDate: new Date(b.endDate) } as any }); res.status(201).json(w); } catch (e) { next(e); }
});
router.get('/warranties', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.warranty.findMany({ where: { orgId: (req as any).orgId } })); } catch (e) { next(e); }
});

const surveySchema = z.object({ projectId: z.string().optional(), rating: z.number().int().min(1).max(5), comment: z.string().optional() });
router.post('/surveys', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = surveySchema.parse(req.body); const s = await prisma.satisfactionSurvey.create({ data: { ...b, orgId: (req as any).orgId } as any }); res.status(201).json(s); } catch (e) { next(e); }
});
router.get('/surveys', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.satisfactionSurvey.findMany({ where: { orgId: (req as any).orgId } })); } catch (e) { next(e); }
});

export default router;

