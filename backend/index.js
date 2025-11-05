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
    const rows = await prisma.$queryRawUnsafe('SELECT id, type, refId FROM "AiTask" WHERE status = $1 ORDER BY createdAt ASC LIMIT 1', 'pending');
    const task = Array.isArray(rows) && rows[0];
    if (!task) return; // nothing to do
    // mark processing
    await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, updatedAt = NOW(), attempts = attempts + 1 WHERE id = $1', task.id, 'processing');
    // For MVP: if AI engine health is OK, immediately mark done (defer real call integration)
    const base = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    let ok = false;
    try {
      const u = new URL(base);
      const agent = (u.protocol === 'https:') ? https : http;
      const opts = { protocol: u.protocol, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), method: 'GET', path: (u.pathname.replace(/\/$/, '')) + '/health' };
      await new Promise((resolve) => {
        const r = agent.request(opts, (p) => { ok = (p.statusCode||500) < 500; resolve(); });
        r.on('error', () => resolve()); r.end();
      });
    } catch {}
    if (!ok) {
      await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, lastError = $3, updatedAt = NOW() WHERE id = $1', task.id, 'pending', 'ai_unreachable');
      return;
    }
    // Mark done (real extraction handled later via callback)
    await prisma.$executeRawUnsafe('UPDATE "AiTask" SET status = $2, updatedAt = NOW() WHERE id = $1', task.id, 'done');
  } catch (e) {
    try { console.warn('[ai-worker]', e?.message || e); } catch {}
  }
}
setInterval(processAiTasksOnce, 3000).unref?.();

app.listen(PORT, HOST, () => console.log(`Server listening on ${HOST}:${PORT}`));
