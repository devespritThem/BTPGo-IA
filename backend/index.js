import './otel.js';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import client from "prom-client";
import { authenticator } from "otplib";
import { PrismaClient } from "@prisma/client";
// QRCode is optional to avoid hard runtime failure if not installed
let QRCode = null;
try { QRCode = (await import('qrcode')).default; } catch {}
import Stripe from "stripe";
import * as openidClient from "openid-client";
const { Issuer, generators } = openidClient;
import Redis from "ioredis";

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || ""; // 32 bytes base64 or hex recommended
const TOTP_ISSUER = process.env.TOTP_ISSUER || "BTPGo";
const OIDC_ISSUER = process.env.OIDC_ISSUER || "";
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || "";
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || "";
const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI || "";

app.use(helmet());
// CORS configuration: allow explicit origins (no wildcard when credentials=true)
const DEFAULT_CORS = [
  FRONTEND_URL,
  'https://www.msmarrakech.com',
  'https://msmarrakech.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : DEFAULT_CORS
).map(s => s.trim()).filter(Boolean);
function matchesOrigin(origin, pattern) {
  try {
    if (!pattern) return false;
    if (pattern === '*') return true;
    // Wildcard subdomain support: https://*.domain.tld
    if (pattern.startsWith('https://*.') || pattern.startsWith('http://*.')) {
      const proto = pattern.startsWith('https://') ? 'https://' : 'http://';
      const base = pattern.replace('https://*.', 'https://').replace('http://*.', 'http://');
      return origin.toLowerCase() === base.toLowerCase() || origin.toLowerCase().endsWith('.' + base.replace(/^https?:\/\//, '').toLowerCase());
    }
    // Exact match by origin
    const o = new URL(origin).origin;
    const p = new URL(pattern).origin;
    return o === p;
  } catch {
    return false;
  }
}

// Fast-path CORS preflight handling to reduce noise and latency
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    try {
      const origin = req.headers.origin || '';
      const allowed = !origin || ALLOWED_ORIGINS.some(p => matchesOrigin(origin, p));
      if (allowed) {
        try { console.log(`[CORS] Preflight ${req.method} ${req.originalUrl} from ${origin} => allowed`); } catch {}
        if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); }
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-org-id,Origin,Accept,X-Requested-With');
        res.set('Access-Control-Max-Age', '600');
        try { corsEventsTotal && corsEventsTotal.inc({ event: 'preflight_allowed', method: 'OPTIONS' }); } catch {}
        return res.sendStatus(204);
      } else {
        try { console.warn(`[CORS] Preflight ${req.method} ${req.originalUrl} from ${origin} => blocked`); } catch {}
        try { corsEventsTotal && corsEventsTotal.inc({ event: 'preflight_blocked', method: 'OPTIONS' }); } catch {}
        return res.status(403).send('CORS preflight blocked');
      }
    } catch {}
  }
  next();
});
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/postman
    const ok = ALLOWED_ORIGINS.some(p => matchesOrigin(origin, p));
    cb(ok ? null : new Error('CORS not allowed'), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-org-id','Origin','Accept','X-Requested-With'],
  exposedHeaders: ['Content-Length','Content-Type','Content-Disposition','ETag','Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 600,
};
// Allow env to override methods/headers
function parseListEnv(name, fallbackCsv) {
  const v = (process.env[name] || '').trim();
  const src = v ? v : fallbackCsv;
  return src.split(',').map(s => s.trim()).filter(Boolean);
}

corsOptions.methods = parseListEnv('CORS_ALLOWED_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
corsOptions.allowedHeaders = parseListEnv('CORS_ALLOWED_HEADERS', 'Authorization,Content-Type,Accept,x-org-id,Origin,X-Requested-With');
corsOptions.exposedHeaders = parseListEnv('CORS_EXPOSED_HEADERS', 'Authorization,Content-Length,Content-Disposition,ETag,Content-Type');

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Stripe webhook: must be registered before express.json to use raw body
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null;
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
app.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe || !stripeWebhookSecret) return res.status(200).send('skipped');
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = Stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;
        const seats = Number(session.metadata?.seats || 1);
        if (orgId) {
          await prisma.subscription.upsert({
            where: { orgId },
            update: { customerId, subscriptionId, plan, status: 'active', seats },
            create: { orgId, customerId, subscriptionId, plan, status: 'active', seats },
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscriptionId = sub.id;
        const status = sub.status;
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);
        await prisma.subscription.update({
          where: { subscriptionId },
          data: { status, currentPeriodEnd },
        }).catch(() => null);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).send('webhook_error');
  }
});
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Root and health endpoints
app.get("/", (_, res) => res.json({ name: "BTPGo API", version: "1.0.0", ts: Date.now() }));
app.get("/health", async (_, res) => {
  try {
    const skip = (process.env.HEALTH_SKIP_DB || '').toLowerCase();
    if (!(skip === '1' || skip === 'true')) {
      await prisma.$queryRaw`SELECT 1`;
    }
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', error: "db_unreachable" });
  }
});

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register],
});
const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total HTTP errors (status >= 400)",
  labelNames: ["method", "route", "class"],
  registers: [register],
});
const authEventsTotal = new client.Counter({
  name: "auth_events_total",
  help: "Authentication events",
  labelNames: ["event"],
  registers: [register],
});

// CORS security events (allowed/blocked)
const corsEventsTotal = new client.Counter({
  name: 'cors_events_total',
  help: 'CORS decisions (allowed/blocked)',
  labelNames: ['event', 'method'],
  registers: [register],
});

// CORS Audit Logger
app.use((req, _res, next) => {
  try {
    const origin = req.headers.origin;
    if (origin) {
      const allowed = ALLOWED_ORIGINS.some(p => matchesOrigin(origin, p));
      corsEventsTotal.inc({ event: allowed ? 'allowed' : 'blocked', method: req.method });
    }
  } catch {}
  next();
});

app.use((req, res, next) => {
  const method = req.method;
  const endTimer = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const status = String(res.statusCode);
    // Prefer Express matched pattern to avoid high-cardinality
    const route = (req.route && req.route.path)
      ? (Array.isArray(req.route.path) ? req.route.path[0] : req.route.path)
      : (req.baseUrl || "unmatched");
    httpRequestsTotal.inc({ method, route, status_code: status });
    endTimer({ method, route, status_code: status });
    const code = res.statusCode;
    if (code >= 400) {
      const cls = code >= 500 ? "5xx" : (code >= 400 ? "4xx" : "other");
      httpErrorsTotal.inc({ method, route, class: cls });
    }
  });
  next();
});
app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (e) {
    res.status(500).send("metrics_error");
  }
});

// AES-256-GCM helpers for sensitive fields
import crypto from "node:crypto";
function aesEncrypt(plain) {
  if (!DATA_ENCRYPTION_KEY) return plain;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}
function aesDecrypt(blob) {
  if (!DATA_ENCRYPTION_KEY) return blob;
  try {
    const [ivB64, encB64, tagB64] = String(blob).split(":");
    const iv = Buffer.from(ivB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
function getKey() {
  const raw = DATA_ENCRYPTION_KEY.trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try { return Buffer.from(raw, "base64"); } catch { /* ignore */ }
  // fallback (NOT recommended for prod)
  return crypto.createHash("sha256").update(raw).digest();
}

// --- Multitenant tenant resolver ---
async function resolveTenant(req) {
  // Priority: header x-org-id → subdomain slug → first membership → user's defaultOrgId
  const headerOrg = req.headers["x-org-id"]; // UUID
  if (headerOrg && typeof headerOrg === 'string') {
    const org = await prisma.org.findUnique({ where: { id: headerOrg } });
    if (org) return org.id;
  }
  const host = (req.headers.host || '').toLowerCase();
  // Expect subdomain like <slug>.msmarrakech.com
  const parts = host.split(':')[0].split('.');
  if (parts.length >= 3) {
    const slug = parts[0];
    if (slug && slug !== 'www') {
      const org = await prisma.org.findUnique({ where: { slug } });
      if (org) return org.id;
    }
  }
  // If authenticated user, pick first membership or default org
  const userId = req.user?.sub;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, include: { orgs: true } });
    if (u?.defaultOrgId) return u.defaultOrgId;
    if (u?.orgs?.length) return u.orgs[0].orgId;
  }
  return null;
}

async function tenantMiddleware(req, res, next) {
  // Skip for readiness/metrics/public
  const publicPaths = ["/", "/health", "/metrics", "/auth/login", "/auth/register", "/auth/oidc/login", "/auth/oidc/callback", "/billing/webhook"];
  if (publicPaths.includes(req.path)) return next();
  // Ensure req.user is available for resolving default org when possible
  if (!req.user) {
    const authz = req.headers.authorization || '';
    if (authz.startsWith('Bearer ')) {
      const token = authz.slice(7);
      try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
    }
  }
  const orgId = await resolveTenant(req);
  if (!orgId) return res.status(400).json({ error: "org_required" });
  res.locals.orgId = orgId;
  next();
}
app.use(tenantMiddleware);

// Auth routes
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash } });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "email_exists" });
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password, otp, backupCode } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      authEventsTotal.inc({ event: "login_failed" });
      await prisma.securityEvent.create({ data: { action: "login_failed", ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { reason: "no_user", email } } }).catch(() => null);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      authEventsTotal.inc({ event: "login_failed" });
      await prisma.securityEvent.create({ data: { userId: user.id, action: "login_failed", ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { reason: "bad_password" } } }).catch(() => null);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    if (user.twoFAEnabled) {
      let totpValid = false;
      if (otp) {
        const secret = user.twoFASecret ? aesDecrypt(user.twoFASecret) : null;
        if (secret) {
          totpValid = authenticator.verify({ token: String(otp), secret });
        }
      }
      if (!totpValid) {
        if (!backupCode) {
          authEventsTotal.inc({ event: "login_failed" });
          await prisma.securityEvent.create({ data: { userId: user.id, action: "login_failed", ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { reason: "otp_missing_or_invalid" } } }).catch(() => null);
          return res.status(401).json({ error: "otp_or_backup_required" });
        }
        const codes = await prisma.backupCode.findMany({ where: { userId: user.id, usedAt: null } });
        let matched = null;
        for (const c of codes) {
          if (await bcrypt.compare(String(backupCode), c.codeHash)) { matched = c; break; }
        }
        if (!matched) {
          authEventsTotal.inc({ event: "login_failed" });
          await prisma.securityEvent.create({ data: { userId: user.id, action: "login_failed", ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { reason: "backup_invalid" } } }).catch(() => null);
          return res.status(401).json({ error: "invalid_backup_code" });
        }
        await prisma.backupCode.update({ where: { id: matched.id }, data: { usedAt: new Date() } });
        authEventsTotal.inc({ event: "backup_used" });
        await prisma.securityEvent.create({ data: { userId: user.id, action: "backup_used", ip: req.ip, userAgent: req.headers['user-agent'] || null } }).catch(() => null);
      }
    }
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    authEventsTotal.inc({ event: "login_success" });
    await prisma.securityEvent.create({ data: { userId: user.id, action: "login_success", ip: req.ip, userAgent: req.headers['user-agent'] || null } }).catch(() => null);
    res.json({ token });
  } catch (e) {
    authEventsTotal.inc({ event: "login_failed" });
    res.status(500).json({ error: "server_error" });
  }
});

function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

const RoleRank = { visitor: 0, member: 1, manager: 2, admin: 3, owner: 4 };
async function withOrgRole(minRole = 'member') {
  return async function (req, res, next) {
    try {
      const orgId = res.locals.orgId;
      if (!orgId) return res.status(400).json({ error: 'org_required' });
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const membership = await prisma.userOrg.findUnique({ where: { userId_orgId: { userId, orgId } } });
      const role = membership?.role || 'visitor';
      res.locals.orgRole = role;
      if (RoleRank[role] >= RoleRank[minRole]) return next();
      return res.status(403).json({ error: 'forbidden' });
    } catch (e) {
      return res.status(500).json({ error: 'server_error' });
    }
  };
}

app.get("/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, email: true, role: true, createdAt: true, twoFAEnabled: true } });
  res.json({ user });
});

// 2FA setup & verify
app.post("/auth/2fa/setup", auth, async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!me) return res.status(404).json({ error: "user_not_found" });
  if (me.twoFAEnabled) return res.status(409).json({ error: "2fa_already_enabled" });
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(me.email, TOTP_ISSUER, secret);
  const secretEnc = aesEncrypt(secret);
  await prisma.user.update({ where: { id: me.id }, data: { twoFASecret: secretEnc } });
  let qrDataUrl = null;
  try { qrDataUrl = await QRCode.toDataURL(otpauth); } catch {}
  res.json({ otpauth, qr: qrDataUrl });
});

app.post("/auth/2fa/verify", auth, async (req, res) => {
  const { otp } = req.body || {};
  if (!otp) return res.status(400).json({ error: "missing_otp" });
  const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!me || !me.twoFASecret) return res.status(404).json({ error: "setup_required" });
  const secret = aesDecrypt(me.twoFASecret);
  if (!secret || !authenticator.verify({ token: String(otp), secret })) {
    return res.status(401).json({ error: "invalid_otp" });
  }
  // Generate backup codes (8 codes), store hashed
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex"));
  const toCreate = [];
  for (const code of codes) {
    const hash = await bcrypt.hash(code, 10);
    toCreate.push({ userId: me.id, codeHash: hash });
  }
  await prisma.backupCode.createMany({ data: toCreate });
  await prisma.user.update({ where: { id: me.id }, data: { twoFAEnabled: true, backupCodes: null } });
  // audit
  await prisma.securityEvent.create({ data: {
    userId: me.id,
    action: "2fa_verify_success",
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
  }});
  res.json({ ok: true, backupCodes: codes });
});

// Disable 2FA (requires valid OTP or backup code)
app.delete("/auth/2fa", auth, async (req, res) => {
  const { otp, backupCode } = req.body || {};
  const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!me) return res.status(404).json({ error: "user_not_found" });
  if (!me.twoFAEnabled) return res.json({ ok: true, alreadyDisabled: true });
  let authorized = false;
  if (otp && me.twoFASecret) {
    const secret = aesDecrypt(me.twoFASecret);
    if (secret && authenticator.verify({ token: String(otp), secret })) authorized = true;
  }
  if (!authorized && backupCode) {
    const codes = await prisma.backupCode.findMany({ where: { userId: me.id, usedAt: null } });
    for (const c of codes) {
      if (await bcrypt.compare(String(backupCode), c.codeHash)) {
        await prisma.backupCode.update({ where: { id: c.id }, data: { usedAt: new Date() } });
        authorized = true; break;
      }
    }
  }
  if (!authorized) {
    await prisma.securityEvent.create({ data: {
      userId: me.id,
      action: "2fa_disable_attempt_failed",
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }});
    return res.status(401).json({ error: "otp_or_backup_required" });
  }
  await prisma.backupCode.deleteMany({ where: { userId: me.id } });
  await prisma.user.update({ where: { id: me.id }, data: { twoFAEnabled: false, twoFASecret: null, backupCodes: null } });
  // audit
  await prisma.securityEvent.create({ data: {
    userId: me.id,
    action: "2fa_disabled",
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
  }});
  authEventsTotal.inc({ event: "2fa_disabled" });
  res.json({ ok: true });
});

// Admin: list security events (paginated)
app.get("/security-events", auth, (await withOrgRole('admin')), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10) || 20));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.securityEvent.count(),
  ]);
  res.json({ items, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
});

// --- SSO OIDC ---
async function oidcStateSet(state, value) {
  const ttl = 300; // 5 minutes
  if (redis) {
    await redis.setex(`oidc:state:${state}`, ttl, JSON.stringify(value));
  } else {
    oidcStateMemory.set(state, { ...value, expiresAt: Date.now() + ttl * 1000 });
  }
}
async function oidcStateGet(state) {
  if (redis) {
    const s = await redis.get(`oidc:state:${state}`);
    return s ? JSON.parse(s) : null;
  }
  const v = oidcStateMemory.get(state);
  if (v && v.expiresAt > Date.now()) return v;
  return null;
}
async function oidcStateDel(state) {
  if (redis) {
    await redis.del(`oidc:state:${state}`);
  } else {
    oidcStateMemory.delete(state);
  }
}
const oidcStateMemory = new Map();
async function getOidcClient() {
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_REDIRECT_URI) return null;
  const issuer = await Issuer.discover(OIDC_ISSUER);
  return new issuer.Client({ client_id: OIDC_CLIENT_ID, client_secret: OIDC_CLIENT_SECRET || undefined, redirect_uris: [OIDC_REDIRECT_URI], response_types: ["code"] });
}

app.get('/auth/oidc/login', async (req, res) => {
  try {
    const client = await getOidcClient();
    if (!client) return res.status(500).json({ error: 'oidc_not_configured' });
    const orgId = await resolveTenant(req);
    const state = generators.state();
    const nonce = generators.nonce();
    await oidcStateSet(state, { orgId, nonce, createdAt: Date.now() });
    const authUrl = client.authorizationUrl({ scope: 'openid email profile', state, nonce });
    res.json({ url: authUrl });
  } catch (e) {
    res.status(500).json({ error: 'oidc_error' });
  }
});

app.get('/auth/oidc/callback', async (req, res) => {
  try {
    const client = await getOidcClient();
    if (!client) return res.status(500).json({ error: 'oidc_not_configured' });
    const params = client.callbackParams(req);
    const entry = await oidcStateGet(params.state);
    if (!entry) return res.status(400).json({ error: 'invalid_state' });
    await oidcStateDel(params.state);
    const tokenSet = await client.callback(OIDC_REDIRECT_URI, params, { state: params.state, nonce: entry.nonce });
    const claims = tokenSet.claims();
    const email = claims.email || claims.preferred_username;
    if (!email) return res.status(400).json({ error: 'email_required' });
    // Upsert user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const tmp = crypto.randomBytes(8).toString('hex');
      const hash = await bcrypt.hash(tmp, 10);
      user = await prisma.user.create({ data: { email, password: hash, role: 'user' } });
    }
    // Resolve org
    let orgId = entry.orgId;
    if (!orgId) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, include: { orgs: true } });
      orgId = u?.defaultOrgId || (u?.orgs?.[0]?.orgId ?? null);
    }
    if (!orgId) return res.status(400).json({ error: 'org_required' });
    // Ensure membership
    await prisma.userOrg.upsert({ where: { userId_orgId: { userId: user.id, orgId } }, update: {}, create: { userId: user.id, orgId, role: 'member' } });
    if (!user.defaultOrgId) { await prisma.user.update({ where: { id: user.id }, data: { defaultOrgId: orgId } }); }
    // Issue our JWT
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    // Set httpOnly cookie (MVP, also fragment fallback)
    try {
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600*1000, path: '/' });
      if (orgId) res.cookie('org_id', orgId, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600*1000, path: '/' });
    } catch {}
    // If FRONTEND_URL is configured, redirect to front callback with token in fragment (MVP)
    if (FRONTEND_URL) {
      const dest = new URL(FRONTEND_URL);
      dest.pathname = '/auth/callback';
      // Use fragment to avoid leaking token in server logs
      const fragment = new URLSearchParams({ token, orgId: orgId || '', email: email || '' }).toString();
      return res.redirect(302, dest.toString() + '#' + fragment);
    }
    res.json({ token, email, orgId });
  } catch (e) {
    res.status(500).json({ error: 'oidc_error' });
  }
});

// Billing endpoints (owner/admin)
app.post('/billing/checkout', auth, (await withOrgRole('admin')), async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });
    const orgId = res.locals.orgId;
    const { plan = 'starter', seats = 1 } = req.body || {};
    const priceId = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STARTER;
    if (!priceId) return res.status(400).json({ error: 'missing_price' });
    // Ensure subscription record
    const sub = await prisma.subscription.upsert({
      where: { orgId },
      update: {},
      create: { orgId, seats: Number(seats) || 1, plan },
    });
    // Ensure customer
    let customerId = sub.customerId;
    if (!customerId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      const customer = await stripe.customers.create({ email: user?.email || undefined, metadata: { orgId } });
      customerId = customer.id;
      await prisma.subscription.update({ where: { orgId }, data: { customerId } });
    }
    const successUrl = process.env.BILLING_SUCCESS_URL || `${FRONTEND_URL}/billing/success`;
    const cancelUrl = process.env.BILLING_CANCEL_URL || `${FRONTEND_URL}/billing/cancel`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: Number(seats) || 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId, plan, seats: String(seats) },
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'billing_error' });
  }
});

app.get('/billing/portal', auth, (await withOrgRole('admin')), async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });
    const orgId = res.locals.orgId;
    const sub = await prisma.subscription.findUnique({ where: { orgId } });
    if (!sub?.customerId) return res.status(400).json({ error: 'no_customer' });
    const returnUrl = process.env.BILLING_SUCCESS_URL || `${FRONTEND_URL}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.customerId,
      return_url: returnUrl,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'portal_error' });
  }
});

// Domain routes (stubs)
app.get("/marches", auth, (await withOrgRole('member')), async (_, res) => {
  const rows = await prisma.marche.findMany({ where: { orgId: res.locals.orgId }, orderBy: { createdAt: "desc" } }).catch(() => []);
  const data = rows.map(r => ({
    ...r,
    notes: r.notes ? aesDecrypt(r.notes) : null,
    clientInfo: r.clientInfo ? aesDecrypt(r.clientInfo) : null,
  }));
  res.json({ data });
});

app.get("/devis", auth, (await withOrgRole('member')), async (_, res) => {
  const rows = await prisma.devis.findMany({ where: { orgId: res.locals.orgId }, orderBy: { createdAt: "desc" } }).catch(() => []);
  const data = rows.map(r => ({
    ...r,
    notes: r.notes ? aesDecrypt(r.notes) : null,
    clientInfo: r.clientInfo ? aesDecrypt(r.clientInfo) : null,
  }));
  res.json({ data });
});

app.get("/chantiers", auth, (await withOrgRole('member')), async (_, res) => {
  const rows = await prisma.chantier.findMany({ where: { orgId: res.locals.orgId }, orderBy: { createdAt: "desc" } }).catch(() => []);
  const data = rows.map(r => ({
    ...r,
    address: r.address ? aesDecrypt(r.address) : null,
    contact: r.contact ? aesDecrypt(r.contact) : null,
  }));
  res.json({ data });
});

app.post("/chantiers", auth, (await withOrgRole('manager')), async (req, res) => {
  const { name, address, contact } = req.body || {};
  if (!name) return res.status(400).json({ error: "missing_name" });
  const created = await prisma.chantier.create({ data: { name, orgId: res.locals.orgId, address: address ? aesEncrypt(address) : null, contact: contact ? aesEncrypt(contact) : null } });
  res.status(201).json({ id: created.id, name: created.name, address, contact });
});

app.post("/marches", auth, (await withOrgRole('manager')), async (req, res) => {
  const { title, status, notes, clientInfo } = req.body || {};
  if (!title) return res.status(400).json({ error: "missing_title" });
  const created = await prisma.marche.create({ data: {
    title,
    status: status || undefined,
    orgId: res.locals.orgId,
    notes: notes ? aesEncrypt(notes) : null,
    clientInfo: clientInfo ? aesEncrypt(clientInfo) : null,
  }});
  res.status(201).json({ id: created.id, title: created.title, status: created.status });
});

app.post("/devis", auth, (await withOrgRole('manager')), async (req, res) => {
  const { ref, amount, status, clientInfo, notes } = req.body || {};
  if (!ref) return res.status(400).json({ error: "missing_ref" });
  const created = await prisma.devis.create({ data: {
    ref,
    amount: typeof amount === 'number' ? amount : undefined,
    status: status || undefined,
    orgId: res.locals.orgId,
    clientInfo: clientInfo ? aesEncrypt(clientInfo) : null,
    notes: notes ? aesEncrypt(notes) : null,
  }}).catch(e => {
    if (e.code === 'P2002') return null;
    throw e;
  });
  if (!created) return res.status(409).json({ error: 'ref_exists' });
  res.status(201).json({ id: created.id, ref: created.ref, amount: created.amount, status: created.status });
});

// Org members management
app.get('/org/members', auth, (await withOrgRole('admin')), async (req, res) => {
  const orgId = res.locals.orgId;
  const members = await prisma.userOrg.findMany({ where: { orgId }, include: { user: { select: { id: true, email: true } } } });
  res.json({ items: members.map(m => ({ userId: m.userId, email: m.user.email, role: m.role })) });
});

app.post('/org/members', auth, (await withOrgRole('admin')), async (req, res) => {
  const orgId = res.locals.orgId;
  const { email, role } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'missing_fields' });
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const tmp = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(tmp, 10);
    user = await prisma.user.create({ data: { email, password: hash, role: 'user' } });
  }
  await prisma.userOrg.upsert({ where: { userId_orgId: { userId: user.id, orgId } }, update: { role }, create: { userId: user.id, orgId, role } });
  await prisma.securityEvent.create({ data: { userId: req.user.sub, action: 'org_member_added', ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { targetUserId: user.id, role } } }).catch(() => null);
  res.status(201).json({ ok: true, userId: user.id, email: user.email, role });
});

app.patch('/org/members/:userId', auth, (await withOrgRole('admin')), async (req, res) => {
  const orgId = res.locals.orgId;
  const { userId } = req.params;
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: 'missing_role' });
  await prisma.userOrg.update({ where: { userId_orgId: { userId, orgId } }, data: { role } }).catch(() => null);
  await prisma.securityEvent.create({ data: { userId: req.user.sub, action: 'org_member_role_updated', ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { targetUserId: userId, role } } }).catch(() => null);
  res.json({ ok: true });
});

app.delete('/org/members/:userId', auth, (await withOrgRole('admin')), async (req, res) => {
  const orgId = res.locals.orgId;
  const { userId } = req.params;
  await prisma.userOrg.delete({ where: { userId_orgId: { userId, orgId } } }).catch(() => null);
  await prisma.securityEvent.create({ data: { userId: req.user.sub, action: 'org_member_removed', ip: req.ip, userAgent: req.headers['user-agent'] || null, meta: { targetUserId: userId } } }).catch(() => null);
  res.json({ ok: true });
});

// AI proxy (placeholder)
app.post("/ai/predict", auth, async (req, res) => {
  // TODO: call ai_engine (http://ai_engine:8000/predict)
  res.json({ ok: true, echo: req.body || {} });
});

app.listen(PORT, '0.0.0.0', () => console.log(`API running on ${PORT}`));
