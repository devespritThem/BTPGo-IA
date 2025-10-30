import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();

// Schemas
const customerSchema = z.object({ name: z.string().min(1), email: z.string().email().optional() });
const supplierSchema = z.object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional() });
const lineSchema = z.object({ description: z.string().min(1), quantity: z.number().positive().default(1), unitPrice: z.number().nonnegative(), taxRate: z.number().min(0).max(1).default(0) });
const invoiceCreateSchema = z.object({ customerId: z.string(), projectId: z.string().optional(), lines: z.array(lineSchema).min(1), dueDate: z.string().datetime().optional() });
const expenseSchema = z.object({ label: z.string().min(1), amount: z.number().nonnegative(), projectId: z.string().optional(), supplierId: z.string().optional(), date: z.string().datetime().optional() });

// Helpers
function computeInvoiceTotals(lines: Array<z.infer<typeof lineSchema>>) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate ?? 0), 0);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// Customers
router.post('/customers', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (err) { next(err); }
});

router.get('/customers', requireAuth, requireOrg, async (_req, res, next) => {
  try { res.json(await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } })); } catch (err) { next(err); }
});

// Suppliers
router.post('/suppliers', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try { const supplier = await prisma.supplier.create({ data: supplierSchema.parse(req.body) }); res.status(201).json(supplier); } catch (err) { next(err); }
});
router.get('/suppliers', requireAuth, requireOrg, async (_req, res, next) => { try { res.json(await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } })); } catch (err) { next(err); } });

// Invoices
router.post('/invoices', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const body = invoiceCreateSchema.parse(req.body);
    const invoice = await prisma.invoice.create({
      data: {
        customerId: body.customerId,
        projectId: body.projectId ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        lines: { create: body.lines },
        orgId: (req as any).orgId,
      },
      include: { lines: true, customer: true },
    });
    const totals = computeInvoiceTotals(invoice.lines as any);
    res.status(201).json({ invoice, totals });
  } catch (err) { next(err); }
});

router.get('/invoices/:id', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, orgId: (req as any).orgId }, include: { lines: true, customer: true, payments: true } });
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    const totals = computeInvoiceTotals(invoice.lines as any);
    const paid = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
    const balance = totals.total - paid;
    const status = balance <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
    res.json({ invoice, totals, paid, balance, status });
  } catch (err) { next(err); }
});

// Expenses
router.post('/expenses', requireAuth, async (req, res, next) => {
  try {
    const body = expenseSchema.parse(req.body);
    const exp = await prisma.expense.create({ data: { ...body, date: body.date ? new Date(body.date) : undefined, orgId: (req as any).orgId } });
    res.status(201).json(exp);
  } catch (err) { next(err); }
});

router.get('/project/:projectId/margin', requireAuth, async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const invoices = await prisma.invoice.findMany({ where: { projectId }, include: { lines: true } });
    const expenses = await prisma.expense.findMany({ where: { projectId } });
    const revenue = invoices.reduce((s, inv) => s + computeInvoiceTotals(inv.lines as any).total, 0);
    const cost = expenses.reduce((s, e) => s + e.amount, 0);
    const margin = revenue - cost;
    const marginRate = revenue > 0 ? margin / revenue : 0;
    res.json({ revenue, cost, margin, marginRate });
  } catch (err) { next(err); }
});

// Payments
const paymentSchema = z.object({ amount: z.number().positive(), method: z.string().optional(), reference: z.string().optional(), date: z.string().datetime().optional() });
router.post('/invoices/:id/payments', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try {
    const inv = await prisma.invoice.findFirst({ where: { id: req.params.id, orgId: (req as any).orgId } });
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const body = paymentSchema.parse(req.body);
    const pay = await prisma.payment.create({ data: { invoiceId: inv.id, amount: body.amount, method: body.method, reference: body.reference, date: body.date ? new Date(body.date) : undefined, orgId: (req as any).orgId } });
    res.status(201).json(pay);
  } catch (err) { next(err); }
});
router.get('/invoices/:id/payments', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.payment.findMany({ where: { invoiceId: req.params.id, orgId: (req as any).orgId }, orderBy: { date: 'desc' } })); } catch (err) { next(err); }
});

// Receipts (non-invoiced income)
const receiptSchema = z.object({ label: z.string().min(1), amount: z.number().positive(), projectId: z.string().optional(), date: z.string().datetime().optional() });
router.post('/receipts', requireAuth, requireOrg, async (req: AuthRequest, res, next) => {
  try { const b = receiptSchema.parse(req.body); const r = await prisma.receipt.create({ data: { ...b, date: b.date ? new Date(b.date) : undefined, orgId: (req as any).orgId } }); res.status(201).json(r); } catch (err) { next(err); }
});
router.get('/receipts', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.receipt.findMany({ where: { orgId: (req as any).orgId }, orderBy: { date: 'desc' } })); } catch (err) { next(err); }
});

// Cashflow summary
router.get('/cashflow', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const orgId = (req as any).orgId as string;
    const [payments, receipts, expenses] = await Promise.all([
      prisma.payment.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
      prisma.receipt.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
      prisma.expense.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
    ]);
    const buckets = new Map<string, { inflow: number; outflow: number }>();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    for (const p of payments) { const k = monthKey(new Date(p.date)); const b = buckets.get(k) || { inflow:0,outflow:0 }; b.inflow += p.amount; buckets.set(k,b); }
    for (const r of receipts) { const k = monthKey(new Date(r.date)); const b = buckets.get(k) || { inflow:0,outflow:0 }; b.inflow += r.amount; buckets.set(k,b); }
    for (const e of expenses) { const k = monthKey(new Date(e.date)); const b = buckets.get(k) || { inflow:0,outflow:0 }; b.outflow += e.amount; buckets.set(k,b); }
    const series = Array.from(buckets.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => ({ month: k, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }));
    res.json({ from, to, series });
  } catch (err) { next(err); }
});

// Profitability analytics
router.get('/analytics/profitability', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const orgId = (req as any).orgId as string;
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
    res.json({ revenue, cashIn, cost, margin, marginRate });
  } catch (err) { next(err); }
});

export default router;
