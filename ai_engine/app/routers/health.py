from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root():
    return {"status": "ok", "service": "btpgo-ai", "version": "1.0"}

