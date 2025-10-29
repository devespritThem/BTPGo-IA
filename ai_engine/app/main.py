from fastapi import FastAPI, Response
from .routers import health, ai, finance, gestion, tenders, simulate, vision, insights, nlp, voice
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

app = FastAPI(title="BTPGo AI Engine")
app.include_router(health.router, prefix="/health", tags=["health"]) 
app.include_router(ai.router, prefix="/ai", tags=["ai"]) 
app.include_router(finance.router, prefix="/finance", tags=["finance"]) 
app.include_router(gestion.router, prefix="/gestion", tags=["gestion"]) 
app.include_router(tenders.router, prefix="/tenders", tags=["tenders"]) 
app.include_router(simulate.router, tags=["finance"]) 
app.include_router(vision.router, prefix="/vision", tags=["vision"]) 
app.include_router(insights.router, tags=["finance"]) 
app.include_router(nlp.router, prefix="/nlp", tags=["nlp"]) 
app.include_router(voice.router, prefix="/voice", tags=["voice"]) 

@app.get('/metrics')
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
