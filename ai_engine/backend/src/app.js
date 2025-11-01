import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import aiRoutes from "./routes/aiRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

const app = express();

app.use(express.json());

// Security headers
app.disable("x-powered-by");
app.use(helmet());

// CORS whitelist via CORS_ORIGINS (comma-separated) or single FRONTEND_URL_PROD
const corsList = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const singleOrigin = process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL;
const whitelist = new Set([...corsList, ...(singleOrigin ? [singleOrigin] : [])]);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (whitelist.size === 0) return cb(null, true);
      return cb(null, whitelist.has(origin));
    },
    credentials: true,
  })
);

// Basic rate limit (global)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Mount AI routes
app.use("/api/ai", aiRoutes);

// Email config health
app.use("/api/email", emailRoutes);

// Simple health endpoint for backend availability checks
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
