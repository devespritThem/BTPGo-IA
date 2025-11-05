import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import https from "node:https";
import { PrismaClient } from "@prisma/client";
import systemRouter from "./routes/system.js";
import authRouter from "./routes/auth.js";
import demoRouter from "./routes/demo.js";
import ingestRouter from "./routes/ingest.js";
import aiCallbackRouter from "./routes/ai_callback.js";
import projectsRouter from "./routes/projects.js";
import decisionsRouter from "./routes/decisions.js";
import alertsRouter from "./routes/alerts.js";
import notificationsRouter from "./routes/notifications.js";
import testRouter from "./routes/test.js";

// Basic process-level error logging (helps in Fly logs and local)
process.on("unhandledRejection", (e) => {
  try { console.error("unhandledRejection", e); } catch {}
});
process.on("uncaughtException", (e) => {
  try { console.error("uncaughtException", e); } catch {}
});

const app = express();
// Prisma singleton to avoid multiple connection pools
const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const PORT = Number(process.env.PORT || 4000);
// Allow IPv6-only bind by setting HOST=:: (default 0.0.0.0)
const HOST = process.env.HOST || "0.0.0.0";

// CORS configurable via CORS_ORIGINS (CSV). Examples:
//   CORS_ORIGINS=https://www.msmarrakech.com,https://msmarrakech.com
//   CORS_ORIGINS=*
const originList = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Parse CSV env helpers
function parseCsvEnv(name, fallback = []) {
  const raw = String(process.env[name] || "");
  const vals = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return vals.length ? vals : fallback;
}

const allowedMethods = parseCsvEnv(
  "CORS_ALLOWED_METHODS",
  ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
);
const allowedHeaders = parseCsvEnv(
  "CORS_ALLOWED_HEADERS",
  ["Content-Type", "Authorization", "X-Org-Id"]
);
const exposedHeaders = parseCsvEnv(
  "CORS_EXPOSED_HEADERS",
  ["Content-Length", "Content-Range"]
);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (originList.length === 0) return cb(null, true); // default allow when unset
    const allowed = originList.some((pat) => {
      if (pat === "*") return true;
      if (pat.startsWith("*.")) {
        const root = pat.slice(2);
        try {
          const u = new URL(origin);
          const host = u.hostname;
          return host === root || host.endsWith(`.${root}`);
        } catch {
          return false;
        }
      }
      return pat === origin;
    });
    return allowed ? cb(null, true) : cb(new Error("CORS blocked"), false);
  },
  credentials: true,
  methods: allowedMethods,
  allowedHeaders,
  exposedHeaders,
};

// Trust proxy for accurate protocol/ip (cookies / redirects)
try { app.set("trust proxy", 1); } catch {}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ---- AI Engine reverse proxy (/ai -> AI_ENGINE_URL) ----
const AI_BASE = process.env.AI_ENGINE_URL || "http://localhost:8000";
let aiUrl;
try { aiUrl = new URL(AI_BASE); } catch { aiUrl = new URL("http://localhost:8000"); }
const aiIsHttps = aiUrl.protocol === "https:";
const aiAgent = aiIsHttps ? https : http;

// Explicit health shortcut to avoid path confusion and ease monitoring
app.get("/ai/health", (req, res) => {
  try {
    const basePath = (aiUrl.pathname || "/").replace(/\/$/, "");
    const path = basePath + "/health";
    const opts = {
      protocol: aiUrl.protocol,
      hostname: aiUrl.hostname,
      port: aiUrl.port || (aiIsHttps ? 443 : 80),
      method: "GET",
      path,
      headers: { host: aiUrl.host },
    };
    const preq = aiAgent.request(opts, (pres) => {
      if (!res.headersSent) res.status(pres.statusCode || 502);
      for (const [k, v] of Object.entries(pres.headers || {})) {
        if (!v) continue; const kl = String(k).toLowerCase();
        if (["transfer-encoding","connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","upgrade"].includes(kl)) continue;
        try { res.setHeader(k, v); } catch {}
      }
      pres.pipe(res);
    });
    preq.on("error", () => { if (!res.headersSent) res.status(502).json({ error: "ai_unreachable" }) });
    preq.end();
  } catch {
    res.status(500).json({ error: "ai_proxy_error" });
  }
});

app.use("/ai", (req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  try {
    const basePath = (aiUrl.pathname || "/").replace(/\/$/, "");
    // Use req.url (path + query) which is already stripped of mount '/ai'
    // Example: original '/ai/health?x=1' -> req.url '/health?x=1'
    const rel = req.url.startsWith('/') ? req.url : '/' + req.url;
    const path = basePath + rel;
    const headers = { ...req.headers, host: aiUrl.host };
    // Remove hop-by-hop headers
    delete headers["connection"]; delete headers["keep-alive"]; delete headers["proxy-authenticate"]; delete headers["proxy-authorization"]; delete headers["te"]; delete headers["trailers"]; delete headers["upgrade"]; 
    // Avoid compressed transfer issues
    delete headers["accept-encoding"]; 

    const opts = {
      protocol: aiUrl.protocol,
      hostname: aiUrl.hostname,
      port: aiUrl.port || (aiIsHttps ? 443 : 80),
      method: req.method,
      path,
      headers,
    };
    const preq = aiAgent.request(opts, (pres) => {
      if (!res.headersSent) res.status(pres.statusCode || 502);
      for (const [k, v] of Object.entries(pres.headers || {})) {
        if (!v) continue;
        const kl = String(k).toLowerCase();
        if (["transfer-encoding","connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","upgrade"].includes(kl)) continue;
        try { res.setHeader(k, v); } catch {}
      }
      pres.pipe(res);
    });
    preq.on("error", (e) => {
      try { console.error("[ai-proxy]", e?.message || e); } catch {}
      if (!res.headersSent) return res.status(502).json({ error: "ai_unreachable" });
      try { res.end(); } catch {}
    });
    req.pipe(preq);
  } catch (e) {
    try { console.error("[ai-proxy-fail]", e?.message || e); } catch {}
    return res.status(500).json({ error: "ai_proxy_error" });
  }
});
// Body parser after /ai proxy so uploads/proxying can stream
app.use(express.json());
app.use(systemRouter);
app.use(authRouter);
app.use(demoRouter);
app.use(ingestRouter);
app.use(aiCallbackRouter);
app.use(projectsRouter);
app.use(decisionsRouter);
app.use(alertsRouter);
app.use(notificationsRouter);
app.use(testRouter);

app.get("/", (_req, res) => res.json({ message: "BTPGo Backend running" }));
app.get("/health", async (req, res) => {
  try {
    const skip = String(process.env.HEALTH_SKIP_DB || "").toLowerCase();
    const forceDb = String(req.query.db || "").toLowerCase();
    const wantDb = forceDb === "1" || forceDb === "true" || forceDb === "yes";
    if (!(skip === "1" || skip === "true") || wantDb) {
      await prisma.$queryRaw`SELECT 1`;
    }
    res.json({ status: "ok" });
  } catch (_e) {
    res.status(500).json({ status: "error", error: "db_unreachable" });
  }
});

// --- Minimal background worker: pick pending AI tasks and try to process ---
async function processAiTasksOnce() {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT id, type, refId, orgId FROM "AiTask" WHERE status = $1 ORDER BY createdAt ASC LIMIT 1', 'pending');
    const task = Array.isArray(rows) && rows[0];
    if (!task) return; // nothing to do
    // mark processing
    await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, updatedAt = NOW(), attempts = attempts + 1 WHERE id = $1', task.id, 'processing');
    // Build AI endpoint and payload according to task type
    const basePath = (aiUrl.pathname || '/').replace(/\/$/, '');
    let endpoint = '';
    let payload = { taskId: task.id };
    if (task.type === 'extract_document') {
      const drows = await prisma.$queryRawUnsafe('SELECT id, title, type, url, projectId FROM "Document" WHERE id = $1', task.refId || task.refid);
      const doc = Array.isArray(drows) && drows[0];
      if (!doc) throw new Error('document_missing');
      endpoint = basePath + '/nlp/extract';
      payload.document = doc;
      payload.context = { orgId: task.orgId || null, projectId: doc?.projectId || null };
    } else if (task.type === 'tag_photo') {
      const prows = await prisma.$queryRawUnsafe('SELECT id, url, projectId FROM "Photo" WHERE id = $1', task.refId || task.refid);
      const photo = Array.isArray(prows) && prows[0];
      if (!photo) throw new Error('photo_missing');
      endpoint = basePath + '/vision/tag';
      payload.photo = photo;
      payload.context = { orgId: task.orgId || null, projectId: photo?.projectId || null };
    } else {
      // unknown task type: mark error
      await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, lastError = $3, updatedAt = NOW() WHERE id = $1', task.id, 'error', 'unknown_task_type');
      return;
    }

    // POST JSON to AI Engine
    const opts = {
      protocol: aiUrl.protocol,
      hostname: aiUrl.hostname,
      port: aiUrl.port || (aiIsHttps ? 443 : 80),
      method: 'POST',
      path: endpoint,
      headers: { 'content-type': 'application/json', host: aiUrl.host },
    };
    const body = JSON.stringify(payload);
    const result = await new Promise((resolve, reject) => {
      const req2 = aiAgent.request(opts, (pres) => {
        let data = '';
        pres.setEncoding('utf8');
        pres.on('data', (c) => (data += c || ''));
        pres.on('end', () => {
          try {
            const isOk = (pres.statusCode || 500) < 400;
            const json = data ? JSON.parse(data) : {};
            return isOk ? resolve(json) : reject(new Error(json?.error || `ai_${pres.statusCode}`));
          } catch (e) {
            return reject(new Error('ai_invalid_json'));
          }
        });
      });
      req2.on('error', (e) => reject(e));
      req2.write(body);
      req2.end();
    });

    // Persist results (if AI responded synchronously)
    try {
      if (Array.isArray(result?.alerts)) {
        for (const al of result.alerts) {
          const id = (al && al.id) || `al_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await prisma.$executeRawUnsafe('INSERT INTO "Alert" (id, orgId, projectId, type, severity, title, message, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            id, task.orgId || null, (al && al.projectId) || null, (al && al.type) || null, (al && al.severity) || null, (al && al.title) || null, (al && al.message) || null, (al && (al.data||null)));
          const nid = `nt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await prisma.$executeRawUnsafe('INSERT INTO "Notification" (id, orgId, module, type, title, message, severity, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            nid, task.orgId || null, 'alert', al?.type || null, al?.title || 'Alerte', al?.message || null, al?.severity || null, al?.data || null);
        }
      }
      if (Array.isArray(result?.decisions)) {
        for (const dc of result.decisions) {
          const id = (dc && dc.id) || `dc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await prisma.$executeRawUnsafe('INSERT INTO "Decision" (id, orgId, projectId, module, action, target, payload, confidence, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            id, task.orgId || null, (dc && dc.projectId) || null, (dc && dc.module) || null, (dc && dc.action) || null, (dc && (dc.target||null)), (dc && (dc.payload||null)), (dc && (dc.confidence||null)), 'proposed');
          const nid = `nt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await prisma.$executeRawUnsafe('INSERT INTO "Notification" (id, orgId, module, type, title, message, severity, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            nid, task.orgId || null, 'decision', dc?.action || null, 'Recommandation IA', dc?.payload?.summary || null, 'info', dc?.payload || null);
        }
      }
      if (Array.isArray(result?.extracts)) {
        for (const ex of result.extracts) {
          const id = (ex && ex.id) || `ex_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const payloadEx = ex && (ex.data || ex);
          await prisma.$executeRawUnsafe('INSERT INTO "Extract" (id, sourceType, sourceId, json) VALUES ($1,$2,$3,$4)',
            id, task.type === 'tag_photo' ? 'photo' : 'document', task.refId || task.refid, payloadEx || {});
        }
      }
      if (Array.isArray(result?.embeddings)) {
        for (const em of result.embeddings) {
          const id = (em && em.id) || `em_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const vec = em && (em.vector || em.values || em);
          await prisma.$executeRawUnsafe('INSERT INTO "Embedding" (id, sourceType, sourceId, vector, dim, model) VALUES ($1,$2,$3,$4,$5,$6)',
            id, task.type === 'tag_photo' ? 'photo' : 'document', task.refId || task.refid, vec || [], (em && em.dim) || null, (em && em.model) || null);
        }
      }
      if (Array.isArray(result?.labels) && task.type === 'tag_photo') {
        await prisma.$executeRawUnsafe('UPDATE "Photo" SET labels = $2 WHERE id = $1', task.refId || task.refid, result.labels);
      }
    } catch (e) {
      try { console.warn('[ai-store]', e?.message || e); } catch {}
    }

    await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, updatedAt = NOW() WHERE id = $1', task.id, 'done');
  } catch (e) {
    try { console.warn('[ai-worker]', e?.message || e); } catch {}
  }
}
setInterval(processAiTasksOnce, 3000).unref?.();

app.listen(PORT, HOST, () => console.log(`Server listening on ${HOST}:${PORT}`));
