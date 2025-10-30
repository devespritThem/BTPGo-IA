import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().trim().min(1),
});

router.get('/', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.project.findMany({
      where: { ownerId: req.user!.id, orgId: (req as any).orgId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const { name } = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({ data: { name, ownerId: req.user!.id, orgId: (req as any).orgId } });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user!.id, orgId: (req as any).orgId } });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const data = createProjectSchema.partial().parse(req.body);
    const found = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user!.id, orgId: (req as any).orgId } });
    if (!found) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.project.update({ where: { id: found.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const found = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user!.id, orgId: (req as any).orgId } });
    if (!found) return res.status(404).json({ error: 'Not found' });
    await prisma.project.delete({ where: { id: found.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
