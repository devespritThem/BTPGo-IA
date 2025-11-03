import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

function verifyToken(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing_token' });
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const payload = jwt.verify(m[1], secret);
    req.user = payload;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function cuid() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const ts = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 16; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `c_${ts}_${rand}`;
}

const router = express.Router();

// POST /demo/seed - insert demo rows into Marche, Devis, Chantier
router.post('/demo/seed', verifyToken, async (_req, res) => {
  try {
    const marches = [
      { id: cuid(), title: 'Marché Gros-Oeuvre A', status: 'active' },
      { id: cuid(), title: 'Marché VRD B', status: 'draft' },
    ];
    const chantiers = [
      { id: cuid(), name: 'Chantier Résidence Atlas', address: 'Marrakech' },
      { id: cuid(), name: 'Chantier Bureaux Center', address: 'Casablanca' },
    ];
    const devis = [
      { id: cuid(), ref: 'DV-2025-001', amount: 125000, status: 'sent' },
      { id: cuid(), ref: 'DV-2025-002', amount: 89000, status: 'draft' },
    ];

    // Insert with tolerance on conflicts
    for (const m of marches) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "Marche" (id, title, status) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        m.id, m.title, m.status
      );
    }
    for (const c of chantiers) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "Chantier" (id, name, address) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        c.id, c.name, c.address
      );
    }
    for (const d of devis) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "Devis" (id, ref, amount, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        d.id, d.ref, d.amount, d.status
      );
    }

    res.json({ ok: true, inserted: { marches: marches.length, chantiers: chantiers.length, devis: devis.length } });
  } catch (e) {
    res.status(500).json({ error: 'seed_failed', detail: e?.message || String(e) });
  }
});

// POST /demo/create/:type - create a single demo row
router.post('/demo/create/:type', verifyToken, async (req, res) => {
  try {
    const t = String(req.params.type || '').toLowerCase();
    const id = cuid();
    if (t === 'marche') {
      const title = 'Marché ' + Math.random().toString(36).slice(2,7).toUpperCase();
      await prisma.$executeRawUnsafe('INSERT INTO "Marche" (id, title, status) VALUES ($1,$2,$3)', id, title, 'active');
      return res.json({ ok: true, type: t, id });
    }
    if (t === 'chantier') {
      const name = 'Chantier ' + Math.random().toString(36).slice(2,7).toUpperCase();
      await prisma.$executeRawUnsafe('INSERT INTO "Chantier" (id, name, address) VALUES ($1,$2,$3)', id, name, 'Marrakech');
      return res.json({ ok: true, type: t, id });
    }
    if (t === 'devis') {
      const ref = 'DV-' + new Date().getFullYear() + '-' + Math.floor(100+Math.random()*900);
      const amount = Math.floor(50000 + Math.random()*150000);
      await prisma.$executeRawUnsafe('INSERT INTO "Devis" (id, ref, amount, status) VALUES ($1,$2,$3,$4)', id, ref, amount, 'draft');
      return res.json({ ok: true, type: t, id });
    }
    return res.status(400).json({ error: 'invalid_type' });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', detail: e?.message || String(e) });
  }
});

// GET /demo/list/:type - last 5 items
router.get('/demo/list/:type', verifyToken, async (req, res) => {
  try {
    const t = String(req.params.type || '').toLowerCase();
    if (t === 'marche') {
      const rows = await prisma.$queryRawUnsafe('SELECT id, title, status FROM "Marche" ORDER BY createdAt DESC NULLS LAST LIMIT 5');
      return res.json({ items: rows });
    }
    if (t === 'chantier') {
      const rows = await prisma.$queryRawUnsafe('SELECT id, name, address FROM "Chantier" ORDER BY createdAt DESC NULLS LAST LIMIT 5');
      return res.json({ items: rows });
    }
    if (t === 'devis') {
      const rows = await prisma.$queryRawUnsafe('SELECT id, ref, amount, status FROM "Devis" ORDER BY createdAt DESC NULLS LAST LIMIT 5');
      return res.json({ items: rows });
    }
    return res.status(400).json({ error: 'invalid_type' });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: e?.message || String(e) });
  }
});

// POST /demo/seed_full - larger dataset
router.post('/demo/seed_full', verifyToken, async (_req, res) => {
  try {
    // create 5 of each with random data
    for (let i = 0; i < 5; i++) {
      await prisma.$executeRawUnsafe('INSERT INTO "Marche" (id, title, status) VALUES ($1,$2,$3)', cuid(), 'Marché ' + i, i % 2 ? 'active' : 'draft');
      await prisma.$executeRawUnsafe('INSERT INTO "Chantier" (id, name, address) VALUES ($1,$2,$3)', cuid(), 'Chantier ' + i, 'Adresse ' + i);
      await prisma.$executeRawUnsafe('INSERT INTO "Devis" (id, ref, amount, status) VALUES ($1,$2,$3,$4)', cuid(), `DV-2025-0${i}`, 50000 + i * 10000, i % 2 ? 'sent' : 'draft');
    }
    res.json({ ok: true, inserted: 15 });
  } catch (e) {
    res.status(500).json({ error: 'seed_full_failed', detail: e?.message || String(e) });
  }
});
// GET /demo/overview - counts
router.get('/demo/overview', verifyToken, async (_req, res) => {
  try {
    const [{ count: m }] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Marche"');
    const [{ count: c }] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Chantier"');
    const [{ count: d }] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Devis"');
    res.json({ marches: m, chantiers: c, devis: d });
  } catch (e) {
    res.status(500).json({ error: 'overview_failed', detail: e?.message || String(e) });
  }
});

// POST /demo/clear - remove demo rows (identified by id starting with 'c_')
router.post('/demo/clear', verifyToken, async (_req, res) => {
  try {
    const d1 = await prisma.$executeRawUnsafe('DELETE FROM "Devis" WHERE id LIKE $1', 'c\_%')
    const d2 = await prisma.$executeRawUnsafe('DELETE FROM "Marche" WHERE id LIKE $1', 'c\_%')
    const d3 = await prisma.$executeRawUnsafe('DELETE FROM "Chantier" WHERE id LIKE $1', 'c\_%')
    res.json({ ok: true, deleted: { devis: Number(d1)||0, marches: Number(d2)||0, chantiers: Number(d3)||0 } })
  } catch (e) {
    res.status(500).json({ error: 'clear_failed', detail: e?.message || String(e) })
  }
});

export default router;
