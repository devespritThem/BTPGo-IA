import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';
import QRCode from 'qrcode';

const router = Router();

const employeeSchema = z.object({ name: z.string().min(1), email: z.string().email().optional(), role: z.string().optional() });

router.post('/employees', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const data = employeeSchema.parse(req.body);
    const emp = await prisma.employee.create({ data: { ...data, orgId: (req as any).orgId } });
    res.status(201).json(emp);
  } catch (err) { next(err); }
});

router.get('/employees', requireAuth, requireOrg, async (req, res, next) => {
  try { res.json(await prisma.employee.findMany({ where: { orgId: (req as any).orgId }, orderBy: { createdAt: 'desc' } })); } catch (err) { next(err); }
});

router.get('/employees/:id/qr', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const emp = await prisma.employee.findFirst({ where: { id: req.params.id, orgId: (req as any).orgId } });
    if (!emp) return res.status(404).json({ error: 'Not found' });
    let secret = emp.qrSecret;
    if (!secret) {
      secret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await prisma.employee.update({ where: { id: emp.id }, data: { qrSecret: secret } });
    }
    const payload = JSON.stringify({ employeeId: emp.id, orgId: (req as any).orgId, secret });
    const png = await QRCode.toDataURL(payload);
    res.json({ png });
  } catch (err) { next(err); }
});

const checkSchema = z.object({ employeeId: z.string(), projectId: z.string().optional(), secret: z.string().optional(), method: z.enum(['qr','manual','vision']).default('qr') });

router.post('/attendance/checkin', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { employeeId, projectId, secret, method } = checkSchema.parse(req.body);
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, orgId: (req as any).orgId } });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (method !== 'manual' && emp.qrSecret && secret !== emp.qrSecret) return res.status(401).json({ error: 'Invalid token' });
    const att = await prisma.attendance.create({ data: { employeeId, projectId, checkIn: new Date(), method } });
    res.status(201).json(att);
  } catch (err) { next(err); }
});

router.post('/attendance/checkout', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { employeeId } = z.object({ employeeId: z.string() }).parse(req.body);
    const att = await prisma.attendance.findFirst({ where: { employeeId }, orderBy: { checkIn: 'desc' } });
    if (!att || att.checkOut) return res.status(400).json({ error: 'No active attendance' });
    const updated = await prisma.attendance.update({ where: { id: att.id }, data: { checkOut: new Date() } });
    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/attendance', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const items = await prisma.attendance.findMany({ where: { projectId: projectId ?? undefined }, include: { employee: true } });
    res.json(items);
  } catch (err) { next(err); }
});

export default router;

