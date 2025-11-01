import os
from fastapi import FastAPI, Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

resource = Resource.create({"service.name": "btpgo-ai"})
provider = TracerProvider(resource=resource)
otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318").rstrip("/") + "/v1/traces"
span_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
provider.add_span_processor(BatchSpanProcessor(span_exporter))
trace.set_tracer_provider(provider)

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)


@app.get("/")
def read_root():
    return {"message": "BTPGo AI Engine Running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "btpgo-ai", "version": "1.0"}


class PredictRequest(BaseModel):
    features: list[float]


@app.post("/predict")
def predict(req: PredictRequest):
    # Placeholder: sum of features as a dummy prediction
    score = float(sum(req.features))
    return {"ok": True, "score": score}


@app.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
