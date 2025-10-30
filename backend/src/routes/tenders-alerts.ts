import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

function shingles(text: string, n = 3) {
  const tokens = text.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç\s]/gi, ' ').split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    set.add(tokens.slice(i, i + n).join(' '));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

router.post('/tenders/store', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const text = String(req.body?.text || '');
    const title = String(req.body?.title || '') || null;
    const source = String(req.body?.source || '') || null;
    if (!text.trim()) return res.status(400).json({ error: 'Missing text' });
    const tender = await prisma.tender.create({ data: { text, title, source, orgId: (req as any).orgId } });
    const sigs = Array.from(shingles(text, 3)).slice(0, 5000).map(s => ({ tenderId: tender.id, signature: s, n: 3 }));
    if (sigs.length) await prisma.tenderSignature.createMany({ data: sigs });
    res.status(201).json({ tenderId: tender.id });
  } catch (e) { next(e); }
});

router.post('/tenders/similar', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const text = String(req.body?.text || '');
    const orgId = (req as any).orgId as string;
    const q = shingles(text, 3);
    if (!q.size) return res.json({ similar: [] });
    const sample = Array.from(q).slice(0, 100);
    const sigs = await prisma.tenderSignature.findMany({ where: { signature: { in: sample }, tender: { orgId } }, include: { tender: true } });
    // approximate: count matches per tender
    const matchCount: Record<string, number> = {};
    for (const s of sigs) matchCount[s.tenderId] = (matchCount[s.tenderId] || 0) + 1;
    const candidates = Object.entries(matchCount).sort((a,b)=> b[1]-a[1]).slice(0, 25).map(([id]) => id);
    const tenders = await prisma.tender.findMany({ where: { id: { in: candidates } } });
    const results = tenders.map(t => ({ id: t.id, title: t.title, score: jaccard(q, shingles(t.text, 3)) })).filter(r => r.score >= 0.3).sort((a,b)=> b.score-a.score);
    res.json({ similar: results });
  } catch (e) { next(e); }
});

export default router;

