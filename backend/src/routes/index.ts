import { Router } from 'express';
import auth from './auth.js';
import health from './health.js';
import projects from './projects.js';
import finance from './finance.js';
import ai from './ai.js';
import tenders from './tenders.js';
import hr from './hr.js';
import gantt from './gantt.js';
import vision from './vision.js';
import analytics from './analytics.js';
import security from './security.js';
import marketplace from './marketplace.js';
import financing from './financing.js';
import maintenance from './maintenance.js';
import subscriptions from './subscriptions.js';
import esg from './esg.js';
import tendersAlerts from './tenders-alerts.js';
import bim from './bim.js';
import push from './push.js';
import assistant from './assistant.js';
import chat from './chat.js';
import projectMessages from './project-messages.js';
import files from './files.js';
import market from './market.js';

const router = Router();

router.use('/auth', auth);
router.use('/health', health);
router.use('/projects', projects);
router.use('/finance', finance);
router.use('/ai', ai);
router.use('/tenders', tenders);
router.use('/hr', hr);
router.use('/gantt', gantt);
router.use('/vision', vision);
router.use('/analytics', analytics);
router.use('/security', security);
router.use('/marketplace', marketplace);
router.use('/', financing);
router.use('/maintenance', maintenance);
router.use('/subscriptions', subscriptions);
router.use('/esg', esg);
router.use('/', tendersAlerts);
router.use('/', bim);
router.use('/', push);
router.use('/assistant', assistant);
router.use('/chat', chat);
router.use('/', projectMessages);
router.use('/', files);
router.use('/', market);

router.get('/', (_req, res) => {
  res.json({ name: 'BTPGo IA Suite', status: 'ok' });
});

export default router;
