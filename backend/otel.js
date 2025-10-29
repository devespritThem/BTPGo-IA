import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const serviceName = process.env.OTEL_SERVICE_NAME || 'btpgo-backend';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
});

registerInstrumentations({
  instrumentations: [
    new PrismaInstrumentation(),
  ],
});

const sdk = new NodeSDK({
  resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start().catch((err) => {
  console.error('OTel start error', err);
});

process.on('SIGTERM', async () => {
  try { await sdk.shutdown(); } catch (e) {}
  process.exit(0);
});

