import express from "express";
import { getEmailConfig, validateEmailConfig } from "../utils/emailConfig.js";

const router = express.Router();

// GET /api/email/health → vérifie la configuration e‑mail (secrets présents)
router.get("/health", (req, res) => {
  const cfg = getEmailConfig();
  const { ok, missing } = validateEmailConfig(cfg);
  res.status(ok ? 200 : 503).json({
    ok,
    missing,
    configured: {
      address: Boolean(cfg.address),
      password: Boolean(cfg.password),
      host: Boolean(cfg.host),
      port: cfg.port,
      secure: cfg.secure,
    },
  });
});

export default router;

