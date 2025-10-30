import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const promptSchema = z.object({ text: z.string().min(1) });

router.post('/estimate', async (req, res) => {
  try {
    const body = promptSchema.parse(req.body);
    const url = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const r = await fetch(url + '/ai/prompt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: body.text }) });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'AI request failed' });
  }
});

export default router;

