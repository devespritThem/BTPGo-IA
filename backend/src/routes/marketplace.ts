import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

const listingSchema = z.object({ title: z.string().min(1), description: z.string().min(1), category: z.string().optional(), location: z.string().optional(), tags: z.array(z.string()).default([]), priceMin: z.number().optional(), priceMax: z.number().optional() });

router.post('/listings', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = listingSchema.parse(req.body); const l = await prisma.listing.create({ data: { ...b, orgId: (req as any).orgId } }); res.status(201).json(l); } catch (e) { next(e); }
});

router.get('/listings', requireAuth, async (req, res, next) => {
  try { const q = String(req.query.q||'').toLowerCase(); const items = await prisma.listing.findMany({ where: { active: true } }); const filtered = q? items.filter(i => (i.title+i.description+(i.tags||[]).join(' ')).toLowerCase().includes(q)) : items; res.json(filtered); } catch (e) { next(e); }
});

const applySchema = z.object({ listingId: z.string(), message: z.string().optional() });
router.post('/apply', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = applySchema.parse(req.body); const l = await prisma.listing.findUnique({ where: { id: b.listingId } }); if (!l) return res.status(404).json({ error: 'Listing not found' }); const app = await prisma.application.create({ data: { listingId: b.listingId, bidderOrgId: (req as any).orgId, message: b.message } }); res.status(201).json(app); } catch (e) { next(e); }
});

router.post('/applications/:id/accept', requireAuth, requireOrg, async (req, res, next) => {
  try { const app = await prisma.application.update({ where: { id: req.params.id }, data: { status: 'accepted' } }); const com = await prisma.commission.create({ data: { listingId: app.listingId, applicationId: app.id, rate: 0.05 } }); res.json({ application: app, commission: com }); } catch (e) { next(e); }
});

router.get('/match', requireAuth, async (_req, res, next) => {
  try { const items = await prisma.listing.findMany({ where: { active: true } }); res.json({ suggestions: items.slice(0, 10) }); } catch (e) { next(e); }
});

export default router;

