// OpenTelemetry pour backend BTPGo (Node 20, ESM)
// Compatible Fly.io avec interop CommonJS pour PrismaInstrumentation

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";

import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Ressource OTEL
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: "btpgo-backend",
  [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
});

// Export vers console (mode dev)
const exporter = new ConsoleSpanExporter();

// SDK Node OpenTelemetry
const sdk = new NodeSDK({
  resource,
  spanProcessor: new SimpleSpanProcessor(exporter),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    getNodeAutoInstrumentations(),
  ],
});

// Démarrage et log
sdk
  .start()
  .then(() => console.log("✅ OTEL initialisé (backend BTPGo)."))
  .catch((err) => console.error("❌ Erreur OTEL:", err));

process.on("SIGTERM", async () => {
  await sdk.shutdown();
  console.log(" OTEL arrêté proprement.");
  process.exit(0);
});

process.on("SIGINT", async () => {
  await sdk.shutdown();
  console.log(" OTEL arrêté proprement.");
  process.exit(0);
});

export default sdk;
