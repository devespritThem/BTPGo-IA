import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const deltaNs = Number(process.hrtime.bigint() - start);
    const seconds = deltaNs / 1e9;
    const route = (req as any).route?.path || req.path || 'unknown';
    httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(seconds);
  });
  next();
}

export async function metricsText() {
  return await client.register.metrics();
}

