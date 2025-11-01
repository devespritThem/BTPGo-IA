// Util e-mail minimal avec fallbacks
// Lit EMAIL_ADDRESS | EMAIL_USER et EMAIL_PASSWORD | EMAIL_PASS
// Optionnels: SMTP_HOST, SMTP_PORT, SMTP_SECURE

export function getEmailConfig() {
  const address = process.env.EMAIL_ADDRESS || process.env.EMAIL_USER || "";
  const password = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || "";
  const host = process.env.SMTP_HOST || "";
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

  return { address, password, host, port, secure };
}

export function validateEmailConfig(cfg = getEmailConfig()) {
  const missing = [];
  if (!cfg.address) missing.push("EMAIL_ADDRESS|EMAIL_USER");
  if (!cfg.password) missing.push("EMAIL_PASSWORD|EMAIL_PASS");
  return { ok: missing.length === 0, missing };
}

export default getEmailConfig;

