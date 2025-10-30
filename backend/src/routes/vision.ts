import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

router.post('/qr/scan', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const url = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const form = new (global as any).FormData();
    form.append('file', new Blob([req.file!.buffer]), req.file!.originalname);
    const r = await fetch(url + '/vision/qr/scan', { method: 'POST', body: form as any });
    const data = await r.json();
    // If decoded payload is an employee QR, verify secret
    try {
      const payload = JSON.parse(data.text || '{}');
      if (payload?.employeeId && payload?.orgId && payload?.secret) {
        const emp = await prisma.employee.findUnique({ where: { id: payload.employeeId } });
        if (emp && emp.orgId === payload.orgId && emp.qrSecret === payload.secret) {
          return res.json({ valid: true, employeeId: emp.id });
        }
      }
    } catch {
      // ignore parse error
    }
    res.json({ valid: false, raw: data });
  } catch (err: any) { res.status(400).json({ error: err?.message || 'QR scan failed' }); }
});

export default router;

