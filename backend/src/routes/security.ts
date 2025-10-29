import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

router.get('/audit', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const logs = await prisma.auditLog.findMany({ where: { orgId }, orderBy: { at: 'desc' }, take: 500 });
    res.json(logs);
  } catch (err) { next(err); }
});

router.get('/anomalies', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const [invoices, expenses, payments] = await Promise.all([
      prisma.invoice.findMany({ where: { orgId }, include: { lines: true } }),
      prisma.expense.findMany({ where: { orgId } }),
      prisma.payment.findMany({ where: { orgId } }),
    ]);
    const alerts: any[] = [];
    // Duplicate detection by (amount, date, label)
    const expKey = (e: any) => `${e.label}|${new Date(e.date).toDateString()}|${e.amount.toFixed(2)}`;
    const seenExp = new Map<string, any>();
    for (const e of expenses) {
      const k = expKey(e);
      if (seenExp.has(k)) alerts.push({ type: 'duplicate_expense', e1: seenExp.get(k).id, e2: e.id });
      else seenExp.set(k, e);
    }
    const payKey = (p: any) => `${p.invoiceId}|${p.amount.toFixed(2)}|${new Date(p.date).toDateString()}`;
    const seenPay = new Set<string>();
    for (const p of payments) {
      const k = payKey(p);
      if (seenPay.has(k)) alerts.push({ type: 'duplicate_payment', id: p.id });
      else seenPay.add(k);
    }
    // Outlier invoices (3x std dev on totals)
    const totals = invoices.map(inv => inv.lines.reduce((s,l)=> s + l.quantity*l.unitPrice*(1+(l.taxRate||0)), 0));
    const mean = totals.reduce((a,b)=>a+b,0)/(totals.length||1);
    const variance = totals.reduce((s,t)=> s + Math.pow(t-mean,2), 0)/(totals.length||1);
    const sd = Math.sqrt(variance);
    invoices.forEach((inv, i) => { if (sd>0 && Math.abs(totals[i]-mean) > 3*sd) alerts.push({ type:'outlier_invoice', id: inv.id, total: totals[i], mean, sd }); });
    res.json({ alerts, stats: { mean, sd, invoiceCount: invoices.length } });
  } catch (err) { next(err); }
});

export default router;

