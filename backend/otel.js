import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const serviceName = process.env.OTEL_SERVICE_NAME || 'btpgo-backend';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
});

// Try to include Prisma instrumentation without crashing if unavailable
let instrumentations = [];
try {
  const prismaPkg = await import('@prisma/instrumentation');
  const PrismaInstrumentation = prismaPkg?.PrismaInstrumentation || prismaPkg?.default?.PrismaInstrumentation;
  if (PrismaInstrumentation) {
    try { instrumentations.push(new PrismaInstrumentation()); }
    catch (e) { console.warn('OTel: prisma instrumentation init failed:', e?.message || String(e)); }
  }
} catch (e) {
  console.warn('OTEL Prisma instrumentation skipped:', e?.message || String(e));
}

instrumentations.push(getNodeAutoInstrumentations());

try {
  registerInstrumentations({ instrumentations });
} catch (e) {
  console.warn('OTel: registerInstrumentations failed:', e?.message || String(e));
}

try {
  const sdk = new NodeSDK({
    resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
    traceExporter,
    instrumentations,
  });
  sdk.start().catch((err) => { console.error('OTel start error', err); });
  process.on('SIGTERM', async () => { try { await sdk.shutdown(); } catch {} process.exit(0); });
  process.on('SIGINT', async () => { try { await sdk.shutdown(); } catch {} process.exit(0); });
} catch (e) {
  console.warn('OTel disabled:', e?.message || String(e));
}
