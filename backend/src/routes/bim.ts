import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = Router();

const modelSchema = z.object({ projectId: z.string(), name: z.string(), version: z.string().optional(), measurements: z.array(z.object({ elementId: z.string(), type: z.string().optional(), surface: z.number().optional(), volume: z.number().optional(), quantity: z.number().optional() })) });

router.post('/bim/models', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const b = modelSchema.parse(req.body);
    const model = await prisma.bimModel.create({ data: { projectId: b.projectId, name: b.name, version: b.version ?? null, measurements: { create: b.measurements } } });
    res.status(201).json(model);
  } catch (e) { next(e); }
});

router.get('/bim/models/:id/summary', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const ms = await prisma.bimMeasurement.findMany({ where: { modelId: req.params.id } });
    const byType = new Map<string, { surface: number; volume: number; quantity: number }>();
    for (const m of ms) {
      const k = (m.type || 'general');
      const agg = byType.get(k) || { surface: 0, volume: 0, quantity: 0 };
      agg.surface += m.surface || 0; agg.volume += m.volume || 0; agg.quantity += m.quantity || 0;
      byType.set(k, agg);
    }
    res.json({ types: Array.from(byType.entries()).map(([type, v]) => ({ type, ...v })) });
  } catch (e) { next(e); }
});

router.post('/bim/models/:id/export/pdf', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const model = await prisma.bimModel.findUnique({ where: { id: req.params.id } });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const ms = await prisma.bimMeasurement.findMany({ where: { modelId: model.id } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bim-${model.id}.pdf"`);
    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(18).text(`BIM Summary: ${model.name}`, { underline: true });
    doc.moveDown();
    const totals: Record<string, { s: number; v: number; q: number }> = {};
    for (const m of ms) {
      const t = (m.type || 'general');
      totals[t] = totals[t] || { s: 0, v: 0, q: 0 };
      totals[t].s += m.surface || 0; totals[t].v += m.volume || 0; totals[t].q += m.quantity || 0;
    }
    for (const [t, a] of Object.entries(totals)) {
      doc.fontSize(12).text(`${t}: surf=${a.s.toFixed(2)} m², vol=${a.v.toFixed(2)} m³, qty=${a.q.toFixed(2)}`);
    }
    doc.end();
  } catch (e) { next(e); }
});

router.post('/bim/models/:id/export/excel', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const model = await prisma.bimModel.findUnique({ where: { id: req.params.id } });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const ms = await prisma.bimMeasurement.findMany({ where: { modelId: model.id } });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Measurements');
    ws.columns = [
      { header: 'Element ID', key: 'elementId' },
      { header: 'Type', key: 'type' },
      { header: 'Surface', key: 'surface' },
      { header: 'Volume', key: 'volume' },
      { header: 'Quantity', key: 'quantity' },
    ];
    ms.forEach(m => ws.addRow({ elementId: m.elementId, type: m.type, surface: m.surface, volume: m.volume, quantity: m.quantity }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bim-${model.id}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

export default router;

