/**
 * backend/otel.js
 * Safe OpenTelemetry instrumentation loader compatible with ESM + CommonJS
 */

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

async function initTelemetry() {
  // Allow hard-disable via env
  const disabled = String(process.env.OTEL_SDK_DISABLED || '').toLowerCase();
  if (disabled === 'true' || disabled === '1' || disabled === 'yes') {
    try { console.warn('OTEL disabled via OTEL_SDK_DISABLED'); } catch {}
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'btpgo-backend';
  // Only enable when an explicit, non-local OTLP endpoint is provided
  const rawEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
  if (!rawEndpoint) {
    try { console.warn('OTEL disabled: no OTEL_EXPORTER_OTLP_ENDPOINT provided'); } catch {}
    return;
  }
  const ep = rawEndpoint.trim();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(ep)) {
    try { console.warn('OTEL disabled: OTLP endpoint points to localhost'); } catch {}
    return;
  }
  const otlpEndpoint = ep.replace(/\/$/, '');

  // Compatible import for prisma/instrumentation (CommonJS) with tolerance
  let PrismaInstrumentation = null;
  try {
    const mod = await import('@prisma/instrumentation');
    PrismaInstrumentation = mod?.PrismaInstrumentation || mod?.default?.PrismaInstrumentation;
    if (PrismaInstrumentation) {
      try { console.log('OTEL Prisma instrumentation loaded'); } catch {}
    }
  } catch (err) {
    try { console.warn('OTEL Prisma instrumentation skipped:', err.message); } catch {}
  }
  const instrumentations = (
    [
      getNodeAutoInstrumentations(),
      PrismaInstrumentation ? new PrismaInstrumentation() : null,
    ]
      .filter(Boolean)
  );

  try {
    registerInstrumentations({ instrumentations });
  } catch (e) {
    try { console.warn('OTEL registerInstrumentations skipped:', e?.message || String(e)); } catch {}
  }

  try {
    const sdk = new NodeSDK({
      resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
      traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
      instrumentations,
    });
    await sdk.start();
    try { console.log('OTEL Telemetry initialized successfully'); } catch {}
    process.on('SIGTERM', async () => { try { await sdk.shutdown(); } catch {} process.exit(0); });
    process.on('SIGINT', async () => { try { await sdk.shutdown(); } catch {} process.exit(0); });
  } catch (err) {
    try { console.warn('OTEL Telemetry initialization failed:', err.message); } catch {}
  }
}

await initTelemetry();
