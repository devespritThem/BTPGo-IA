import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

async function invoiceTotals(inv: any) {
  const subtotal = inv.lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
  const tax = inv.lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice * (l.taxRate || 0), 0);
  const total = subtotal + tax;
  const paid = (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  return { total, paid, balance: total - paid };
}

router.get('/dashboard', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const now = new Date();
    const from90 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    const [invoices, payments, receipts, expenses, projects] = await Promise.all([
      prisma.invoice.findMany({ where: { orgId, issueDate: { gte: from90 } }, include: { lines: true, payments: true } }),
      prisma.payment.findMany({ where: { orgId, date: { gte: from90 } } }),
      prisma.receipt.findMany({ where: { orgId, date: { gte: from90 } } }),
      prisma.expense.findMany({ where: { orgId, date: { gte: from90 } } }),
      prisma.project.findMany({ where: { orgId } }),
    ]);
    const totals = await Promise.all(invoices.map(invoiceTotals));
    const revenue = totals.reduce((s, t) => s + t.total, 0) + receipts.reduce((s, r) => s + r.amount, 0);
    const cashIn = payments.reduce((s, p) => s + p.amount, 0) + receipts.reduce((s, r) => s + r.amount, 0);
    const cost = expenses.reduce((s, e) => s + e.amount, 0);
    const margin = revenue - cost;
    const marginRate = revenue > 0 ? margin / revenue : 0;
    const receivables = totals.reduce((s, t) => s + t.balance, 0);
    res.json({
      kpis: { revenue, cashIn, cost, margin, marginRate, receivables, projects: projects.length },
    });
  } catch (err) { next(err); }
});

router.get('/projects', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
    const projects = await prisma.project.findMany({ where: { orgId } });
    const result = [] as any[];
    for (const p of projects) {
      const [invoices, expenses] = await Promise.all([
        prisma.invoice.findMany({ where: { orgId, projectId: p.id }, include: { lines: true, payments: true } }),
        prisma.expense.findMany({ where: { orgId, projectId: p.id } }),
      ]);
      const totals = await Promise.all(invoices.map(invoiceTotals));
      const revenue = totals.reduce((s, t) => s + t.total, 0);
      const paid = totals.reduce((s, t) => s + t.paid, 0);
      const cost = expenses.reduce((s, e) => s + e.amount, 0);
      const margin = revenue - cost;
      const marginRate = revenue > 0 ? margin / revenue : 0;
      // Simple risk from gantt
      const tasks = await prisma.ganttTask.findMany({ where: { projectId: p.id } });
      const outdoor = tasks.filter(t => (t.category || '').toLowerCase() === 'outdoor').length;
      const deps = await prisma.ganttDependency.count({ where: { task: { projectId: p.id } } });
      const duration = tasks.reduce((s, t) => s + (t.durationDays || 1), 0);
      const risk = Math.min(1, 0.2 + 0.02*deps + 0.01*outdoor + 0.0005*duration);
      result.push({ projectId: p.id, name: p.name, revenue, paid, cost, margin, marginRate, risk });
    }
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/ask', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const q: string = String((req.body?.question || '').toString().toLowerCase());
    const orgId = (req as any).orgId as string;
    async function profitability() {
      const [invoices, payments, receipts, expenses] = await Promise.all([
        prisma.invoice.findMany({ where: { orgId }, include: { lines: true } }),
        prisma.payment.findMany({ where: { orgId } }),
        prisma.receipt.findMany({ where: { orgId } }),
        prisma.expense.findMany({ where: { orgId } }),
      ]);
      const totalsForInvoice = (inv: any) => {
        const subtotal = inv.lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
        const tax = inv.lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice * (l.taxRate || 0), 0);
        return { total: subtotal + tax };
      };
      const paidByInvoice = payments.reduce((m: any, p: any) => (m[p.invoiceId] = (m[p.invoiceId] || 0) + p.amount, m), {} as Record<string, number>);
      const revenue = receipts.reduce((s, r) => s + r.amount, 0) + invoices.reduce((s, inv) => s + totalsForInvoice(inv).total, 0);
      const cashIn = receipts.reduce((s, r) => s + r.amount, 0) + Object.values(paidByInvoice).reduce((a, b) => a + b, 0);
      const cost = expenses.reduce((s, e) => s + e.amount, 0);
      const margin = revenue - cost;
      const marginRate = revenue > 0 ? margin / revenue : 0;
      return { revenue, cashIn, cost, margin, marginRate };
    }
    if (/cash.?flow|tr[eé]sorerie/.test(q)) {
      const to = new Date(); const from = new Date(to.getFullYear(), to.getMonth()-2, 1);
      const [payments, receipts, expenses] = await Promise.all([
        prisma.payment.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
        prisma.receipt.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
        prisma.expense.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
      ]);
      const totalIn = payments.reduce((s, p) => s + p.amount, 0) + receipts.reduce((s, r) => s + r.amount, 0);
      const totalOut = expenses.reduce((s, e) => s + e.amount, 0);
      return res.json({ intent: 'cashflow', answer: `In: ${totalIn.toFixed(2)}, Out: ${totalOut.toFixed(2)}, Net: ${(totalIn-totalOut).toFixed(2)}` });
    }
    if (/marge|rentabilit[eé]|profit/.test(q)) {
      const p = await profitability();
      return res.json({ intent: 'profitability', data: p, answer: `Marge ${p.margin.toFixed(2)} (${(p.marginRate*100).toFixed(1)}%).` });
    }
    if (/impay[eé]|recevables|retard/i.test(q)) {
      const invoices = await prisma.invoice.findMany({ where: { orgId }, include: { lines: true, payments: true } });
      let receivables = 0; for (const inv of invoices) { const t = await invoiceTotals(inv); receivables += t.balance; }
      return res.json({ intent: 'receivables', amount: receivables, answer: `Impayés totaux ${receivables.toFixed(2)}.` });
    }
    if (/risque|retard|pr[eé]vision/i.test(q)) {
      // compute simple org risk as avg of projects
      const projects = await prisma.project.findMany({ where: { orgId } });
      let avg = 0; let n = 0;
      for (const p of projects) {
        const tasks = await prisma.ganttTask.findMany({ where: { projectId: p.id } });
        const outdoor = tasks.filter(t => (t.category || '').toLowerCase() === 'outdoor').length;
        const deps = await prisma.ganttDependency.count({ where: { task: { projectId: p.id } } });
        const duration = tasks.reduce((s, t) => s + (t.durationDays || 1), 0);
        const risk = Math.min(1, 0.2 + 0.02*deps + 0.01*outdoor + 0.0005*duration);
        avg += risk; n++;
      }
      const risk = n ? avg/n : 0;
      return res.json({ intent: 'risk', risk, answer: `Risque moyen ${(risk*100).toFixed(0)}%.` });
    }
    // default: help
    return res.json({ intent: 'help', answer: 'Exemples: "cashflow", "marge", "impayés", "risque".' });
  } catch (err) { next(err); }
});

export default router;

