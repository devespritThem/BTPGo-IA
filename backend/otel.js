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
  const serviceName = process.env.OTEL_SERVICE_NAME || 'btpgo-backend';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

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
      traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces` }),
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
