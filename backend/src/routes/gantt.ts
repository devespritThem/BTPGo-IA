import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

const taskSchema = z.object({ name: z.string().min(1), category: z.string().optional(), start: z.string().datetime().optional(), end: z.string().datetime().optional(), durationDays: z.number().int().positive().optional(), dependencies: z.array(z.string()).optional() });

router.post('/projects/:projectId/tasks', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const body = taskSchema.parse(req.body);
    const task = await prisma.ganttTask.create({ data: { projectId: req.params.projectId, name: body.name, category: body.category ?? null, start: body.start ? new Date(body.start) : null, end: body.end ? new Date(body.end) : null, durationDays: body.durationDays ?? null } });
    if (body.dependencies?.length) {
      await prisma.ganttDependency.createMany({ data: body.dependencies.map(d => ({ taskId: task.id, dependsOnId: d })) });
    }
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.get('/projects/:projectId/tasks', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const tasks = await prisma.ganttTask.findMany({ where: { projectId: req.params.projectId }, include: { dependencies: true } });
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/schedule', requireAuth, requireOrg, async (req, res) => {
  try {
    const url = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const r = await fetch(url + '/planning/schedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) });
    const data = await r.json();
    res.json(data);
  } catch (err: any) { res.status(400).json({ error: err?.message || 'Schedule failed' }); }
});

router.post('/forecast', requireAuth, requireOrg, async (req, res) => {
  try {
    const url = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const r = await fetch(url + '/planning/forecast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) });
    const data = await r.json();
    res.json(data);
  } catch (err: any) { res.status(400).json({ error: err?.message || 'Forecast failed' }); }
});

export default router;

