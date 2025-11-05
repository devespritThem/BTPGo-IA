import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const router = express.Router();

// POST /ai/callback { taskId, extracts?:[], embeddings?:[] }
router.post('/ai/callback', async (req, res) => {
  try {
    const { taskId, extracts, embeddings } = req.body || {};
    if (!taskId) return res.status(400).json({ error: 'missing_taskId' });
    // load task
    const row = await prisma.$queryRawUnsafe('SELECT id, orgId, type, refId, status FROM "AiTask" WHERE id = $1', String(taskId));
    const task = Array.isArray(row) && row[0];
    if (!task) return res.status(404).json({ error: 'task_not_found' });

    // store alerts (if any)
    try {
      if (Array.isArray(req.body?.alerts)) {
        for (const al of req.body.alerts) {
          const id = (al && al.id) || `al_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const { orgId } = task;
          await prisma.$executeRawUnsafe('INSERT INTO "Alert" (id, orgId, projectId, type, severity, title, message, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            id, orgId || null, (al && al.projectId) || null, (al && al.type) || null, (al && al.severity) || null, (al && al.title) || null, (al && al.message) || null, (al && (al.data||null)));
        }
      }
    } catch {}

    // store decisions (if any)
    try {
      if (Array.isArray(req.body?.decisions)) {
        for (const dc of req.body.decisions) {
          const id = (dc && dc.id) || `dc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const { orgId } = task;
          await prisma.$executeRawUnsafe('INSERT INTO "Decision" (id, orgId, projectId, module, action, target, payload, confidence, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            id, orgId || null, (dc && dc.projectId) || null, (dc && dc.module) || null, (dc && dc.action) || null, (dc && (dc.target||null)), (dc && (dc.payload||null)), (dc && (dc.confidence||null)), 'proposed');
        }
      }
    } catch {}

    // store extracts
    if (Array.isArray(extracts)) {
      for (const ex of extracts) {
        const id = (ex && ex.id) || `ex_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        const payload = ex && (ex.data || ex);
        await prisma.$executeRawUnsafe('INSERT INTO "Extract" (id, sourceType, sourceId, json) VALUES ($1,$2,$3,$4)',
          id, task.type === 'tag_photo' ? 'photo' : 'document', task.refid || task.refId, payload || {});
      }
    }
    // store embeddings
    if (Array.isArray(embeddings)) {
      for (const em of embeddings) {
        const id = (em && em.id) || `em_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        const payload = em && (em.vector || em.values || em);
        await prisma.$executeRawUnsafe('INSERT INTO "Embedding" (id, sourceType, sourceId, vector, dim, model) VALUES ($1,$2,$3,$4,$5,$6)',
          id, task.type === 'tag_photo' ? 'photo' : 'document', task.refid || task.refId, payload || [], (em && em.dim) || null, (em && em.model) || null);
      }
    }
    // Optional: labels (for photo tagging)
    try {
      if (Array.isArray(req.body?.labels) && (task.type === 'tag_photo')) {
        await prisma.$executeRawUnsafe('UPDATE "Photo" SET labels = $2 WHERE id = $1', task.refid || task.refId, req.body.labels);
      }
    } catch {}

    await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, updatedAt = NOW() WHERE id = $1', String(taskId), 'done');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'callback_failed', detail: e?.message || String(e) });
  }
});

export default router;
