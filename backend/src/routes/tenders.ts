import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.post('/extract', requireAuth, upload.array('files', 5), async (req, res) => {
  try {
    const url = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const formData = new (global as any).FormData();
    // Node 20 supports fetch/FormData/Blob natively
    for (const f of (req.files as Express.Multer.File[])) {
      formData.append('files', new Blob([f.buffer]), f.originalname);
    }
    const r = await fetch(url + '/tenders/extract', { method: 'POST', body: formData as any });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Extraction failed' });
  }
});

export default router;

