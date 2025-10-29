import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

const financeSchema = z.object({ amountRequested: z.number().positive(), projectId: z.string().optional(), purpose: z.string().optional() });

router.post('/finance/apply', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const b = financeSchema.parse(req.body);
    const orgId = (req as any).orgId as string;
    // compute simple score from profitability
    const expenses = await prisma.expense.findMany({ where: { orgId } });
    const invoices = await prisma.invoice.findMany({ where: { orgId }, include: { lines: true } });
    const revenue = invoices.reduce((s, inv) => s + inv.lines.reduce((ss,l)=> ss + l.quantity*l.unitPrice*(1+(l.taxRate||0)), 0), 0);
    const cost = expenses.reduce((s,e)=> s+e.amount, 0);
    const marginRate = revenue>0 ? (revenue-cost)/revenue : 0;
    const risk = Math.max(0, 0.5 - marginRate); // better margin => lower risk
    const score = Math.round(700 + (marginRate*200) - (risk*100));
    const fa = await prisma.financeApplication.create({ data: { orgId, amountRequested: b.amountRequested, projectId: b.projectId ?? null, purpose: b.purpose, risk, score, status: 'submitted' } });
    res.status(201).json(fa);
  } catch (e) { next(e); }
});

const insuranceSchema = z.object({ projectId: z.string().optional(), coverage: z.string().optional(), sumInsured: z.number().optional() });
router.post('/insurance/apply', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const b = insuranceSchema.parse(req.body);
    const orgId = (req as any).orgId as string;
    // simple risk from gantt
    let risk = 0;
    if (b.projectId) {
      const tasks = await prisma.ganttTask.findMany({ where: { projectId: b.projectId } });
      const outdoor = tasks.filter(t => (t.category||'').toLowerCase()==='outdoor').length;
      const deps = await prisma.ganttDependency.count({ where: { task: { projectId: b.projectId } } });
      const duration = tasks.reduce((s,t)=> s+(t.durationDays||1),0);
      risk = Math.min(1, 0.2 + 0.02*deps + 0.01*outdoor + 0.0005*duration);
    }
    const ia = await prisma.insuranceApplication.create({ data: { orgId, projectId: b.projectId ?? null, coverage: b.coverage, sumInsured: b.sumInsured ?? null, risk, status: 'submitted' } });
    res.status(201).json(ia);
  } catch (e) { next(e); }
});

export default router;

