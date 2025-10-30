import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

const factorSchema = z.object({ name: z.string(), unit: z.string(), factorKgCO2ePerUnit: z.number().positive(), category: z.string().optional() });
router.post('/factors', requireAuth, async (req, res, next) => {
  try { const f = await prisma.emissionFactor.create({ data: factorSchema.parse(req.body) }); res.status(201).json(f); } catch (e) { next(e); }
});
router.get('/factors', async (_req, res, next) => { try { res.json(await prisma.emissionFactor.findMany()); } catch (e) { next(e); } });

const emissionSchema = z.object({ projectId: z.string(), factorId: z.string(), quantity: z.number().positive() });
router.post('/projects/emissions', requireAuth, requireOrg, async (req, res, next) => {
  try { const b = emissionSchema.parse(req.body); const e = await prisma.projectEmission.create({ data: b }); res.status(201).json(e); } catch (err) { next(err); }
});
router.get('/projects/:projectId/emissions', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const items = await prisma.projectEmission.findMany({ where: { projectId: req.params.projectId }, include: { factor: true } });
    const total = items.reduce((s, i) => s + i.quantity * (i.factor as any).factorKgCO2ePerUnit, 0);
    res.json({ totalKgCO2e: total, items });
  } catch (e) { next(e); }
});

router.get('/projects/:projectId/recommendations', requireAuth, async (req, res) => {
  // Simple heuristics for CO2 reduction
  res.json({
    tips: [
      'Privilégier matériaux à faible CO₂ (béton bas carbone, acier recyclé).',
      'Optimiser logistique pour réduire trajets à vide.',
      'Planifier tâches outdoor hors pics météo pour éviter reprises.',
      'Electrifier équipements ou utiliser biocarburants lorsque possible.'
    ]
  });
});

export default router;

