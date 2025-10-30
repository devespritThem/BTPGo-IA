import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

async function assertProjectOrg(projectId: string, orgId: string) {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!p) throw Object.assign(new Error('Project not found'), { status: 404 });
}

router.get('/projects/:projectId/messages', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const projectId = req.params.projectId;
    await assertProjectOrg(projectId, orgId);
    const take = Math.min(Number(req.query.take || 50), 200);
    const skip = Number(req.query.skip || 0);
    const items = await prisma.projectMessage.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' }, skip, take, include: { author: true } });
    res.json(items);
  } catch (e) { next(e); }
});

const messageSchema = z.object({ content: z.string().min(1) });
router.post('/projects/:projectId/messages', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const projectId = req.params.projectId;
    await assertProjectOrg(projectId, orgId);
    const { content } = messageSchema.parse(req.body);
    const msg = await prisma.projectMessage.create({ data: { projectId, authorId: (req as any).user?.id ?? null, content } });
    res.status(201).json(msg);
  } catch (e) { next(e); }
});

router.get('/projects/:projectId/messages/summary', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const projectId = req.params.projectId;
    const targetLang = String(req.query.lang || '') || undefined;
    await assertProjectOrg(projectId, orgId);
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;
    const where: any = { projectId };
    if (since) where.createdAt = { gte: since };
    const items = await prisma.projectMessage.findMany({ where, orderBy: { createdAt: 'asc' } });
    const text = items.map(i => `- ${i.content}`).join('\n').slice(0, 8000);
    const base = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const sum = await fetch(base + '/nlp/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }).then(r=>r.json());
    let out = sum.summary || '';
    if (targetLang) {
      try { const tr = await fetch(base + '/nlp/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: out, targetLang }) }).then(r=>r.json()); out = tr.text || out; } catch {}
    }
    res.json({ count: items.length, summary: out });
  } catch (e) { next(e); }
});

export default router;

