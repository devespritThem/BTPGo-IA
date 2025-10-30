import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

router.post('/sessions', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const session = await prisma.chatSession.create({ data: { name, orgId: (req as any).orgId, createdById: (req as any).user?.id } });
    await prisma.chatMember.create({ data: { sessionId: session.id, userId: (req as any).user!.id, role: 'admin' } });
    res.status(201).json(session);
  } catch (e) { next(e); }
});

router.get('/sessions', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.chatSession.findMany({ where: { orgId: (req as any).orgId }, orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); }
});

router.post('/sessions/:id/members', requireAuth, requireOrg, async (req, res, next) => {
  try { const { userId } = z.object({ userId: z.string() }).parse(req.body); const m = await prisma.chatMember.create({ data: { sessionId: req.params.id, userId, role: 'member' } }); res.status(201).json(m); } catch (e) { next(e); }
});

router.get('/sessions/:id/messages', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.chatMessage.findMany({ where: { sessionId: req.params.id }, orderBy: { createdAt: 'asc' } })); } catch (e) { next(e); }
});

router.post('/sessions/:id/messages', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { content, lang } = z.object({ content: z.string().min(1), lang: z.string().optional() }).parse(req.body);
    const msg = await prisma.chatMessage.create({ data: { sessionId: req.params.id, userId: (req as any).user?.id, role: 'user', content, lang: lang ?? null } });
    // Assistant reply via analytics intents
    const ask = await fetch(`${req.protocol}://${req.get('host')}/analytics/ask`, { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': req.headers.authorization || '' }, body: JSON.stringify({ question: content }) }).then(r=>r.json()).catch(()=>({ answer: '...' }));
    const reply = await prisma.chatMessage.create({ data: { sessionId: req.params.id, role: 'assistant', content: ask.answer || '...' } });
    res.status(201).json({ user: msg, assistant: reply });
  } catch (e) { next(e); }
});

export default router;

