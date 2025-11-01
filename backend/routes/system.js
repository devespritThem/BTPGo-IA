import express from 'express';
import { PrismaClient } from '@prisma/client';

// Single Prisma instance (reuse from global if provided)
const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

// Capture process start time
const processStart = Date.now();

// Try to import version from package.json (Node 20 JSON import)
let appVersion = 'unknown';
try {
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  appVersion = pkg?.default?.version || 'unknown';
} catch {}

const router = express.Router();

router.get('/version', (_req, res) => {
  const now = Date.now();
  const buildId = process.env.BUILD_ID || process.env.GIT_SHA || process.env.FLY_ALLOC_ID || process.env.FLY_MACHINE_ID || null;
  res.json({
    version: appVersion,
    buildId,
    timestamp: new Date(now).toISOString(),
    uptime: Number(process.uptime().toFixed(3)),
    startedAt: new Date(processStart).toISOString(),
  });
});

router.get('/metrics', async (_req, res) => {
  try {
    // memory and cpu
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    // db state
    let db = 'unknown';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch (e) {
      db = 'error';
    }
    res.json({
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
      cpu, // user/system microseconds
      uptime: Number(process.uptime().toFixed(3)),
      db,
    });
  } catch (e) {
    res.status(500).json({ error: 'metrics_error' });
  }
});

export default router;

