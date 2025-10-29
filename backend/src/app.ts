import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import { auditLogger } from './middleware/audit.js';
import rateLimit from 'express-rate-limit';
import { metricsMiddleware, metricsText } from './metrics.js';

const app = express();
app.use(helmet());
const allowed = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: allowed.includes('*') ? true : allowed, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(metricsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(auditLogger);

app.use('/', routes);
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(await metricsText());
});

app.use(errorHandler);

export default app;
