from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root():
    return {"ok": True, "service": "ai_engine"}

