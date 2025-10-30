import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.post('/text', requireAuth, async (req, res) => {
  try {
    const { text, targetLang } = z.object({ text: z.string().min(1), targetLang: z.string().optional() }).parse(req.body);
    const base = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const det = await fetch(base + '/nlp/detect_lang', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }).then(r=>r.json());
    const sum = await fetch(base + '/nlp/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }).then(r=>r.json());
    let translated = sum.summary;
    if (targetLang && targetLang !== det.lang) {
      try {
        const tr = await fetch(base + '/nlp/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: sum.summary, targetLang }) }).then(r=>r.json());
        translated = tr.text || translated;
      } catch {}
    }
    res.json({ lang: det.lang, summary: sum.summary, translated });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed' });
  }
});

router.post('/voice', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const base = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const form = new (global as any).FormData();
    form.append('audio', new Blob([req.file!.buffer]), req.file!.originalname || 'audio.wav');
    const tr = await fetch(base + '/voice/transcribe', { method: 'POST', body: form as any }).then(r=>r.json());
    const sum = await fetch(base + '/nlp/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: tr.text || '' }) }).then(r=>r.json());
    res.json({ transcript: tr.text, summary: sum.summary });
  } catch (err: any) { res.status(400).json({ error: err?.message || 'Transcribe failed' }); }
});

export default router;

