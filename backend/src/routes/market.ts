import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.post('/market/prices/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const csv = req.file?.buffer.toString('utf8') || '';
    const rows: any[] = parse(csv, { columns: true, skip_empty_lines: true });
    const toCreate = rows.map(r => ({
      category: r.category || null,
      item: r.item || r.description || 'item',
      unit: r.unit || null,
      price: Number(r.price || r.avg || 0),
      currency: r.currency || 'EUR',
      region: r.region || null,
      source: r.source || 'upload',
      effectiveDate: r.effectiveDate ? new Date(r.effectiveDate) : null,
    }));
    const created = await prisma.marketPrice.createMany({ data: toCreate });
    res.json({ inserted: created.count });
  } catch (e) { next(e); }
});

router.get('/market/prices/average', async (req, res, next) => {
  try {
    const { category, item, region } = req.query as any;
    const where: any = {};
    if (category) where.category = category;
    if (item) where.item = item;
    if (region) where.region = region;
    const prices = await prisma.marketPrice.findMany({ where });
    const avg = prices.length ? prices.reduce((s, p) => s + p.price, 0)/prices.length : 0;
    res.json({ count: prices.length, average: avg });
  } catch (e) { next(e); }
});

router.get('/market/benchmarks', async (_req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({ where: { active: true } });
    const byCat: Record<string, { n: number; min: number; max: number } > = {} as any;
    for (const l of listings) {
      const k = l.category || 'general';
      const m = byCat[k] || { n:0, min: 0, max: 0 };
      m.n += 1;
      if (typeof l.priceMin === 'number') m.min += l.priceMin;
      if (typeof l.priceMax === 'number') m.max += l.priceMax;
      byCat[k] = m;
    }
    const out = Object.entries(byCat).map(([category, v]) => ({ category, avgMin: v.min/Math.max(v.n,1), avgMax: v.max/Math.max(v.n,1), count: v.n }));
    res.json(out);
  } catch (e) { next(e); }
});

export default router;

