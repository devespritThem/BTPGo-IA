from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post('/transcribe')
async def transcribe(audio: UploadFile = File(...)):
    # Placeholder: real STT (Whisper/Vosk) can be plugged here
    data = await audio.read()
    return { 'text': '', 'info': f'audio received: {len(data)} bytes' }

