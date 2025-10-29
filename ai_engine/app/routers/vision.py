from fastapi import APIRouter, UploadFile, File
import cv2  # type: ignore
import numpy as np  # type: ignore

router = APIRouter()

@router.post('/qr/scan')
async def qr_scan(file: UploadFile = File(...)):
    data = await file.read()
    npimg = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    detector = cv2.QRCodeDetector()
    val, points, _ = detector.detectAndDecode(img)
    return {"text": val or "", "points": points.tolist() if points is not None else None}

