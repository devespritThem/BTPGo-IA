from fastapi import APIRouter, UploadFile, File
from typing import List, Optional
import io
import re

try:
    import pdfplumber  # type: ignore
except Exception:  # pragma: no cover
    pdfplumber = None

try:
    from PIL import Image  # type: ignore
except Exception:  # pragma: no cover
    Image = None

try:
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover
    pytesseract = None

router = APIRouter()

def extract_text_from_pdf(data: bytes) -> str:
    if not pdfplumber:
        return ""
    text = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text() or "")
    return "\n".join(text)

def extract_text_from_image(data: bytes) -> str:
    if not (Image and pytesseract):
        return ""
    img = Image.open(io.BytesIO(data))
    return pytesseract.image_to_string(img, lang='fra+eng')

def heuristic_extract(text: str):
    amounts = [m.group() for m in re.finditer(r"\b\d{1,3}(?:[\s,]\d{3})*(?:[\.,]\d{2})?\b\s*(?:€|EUR)?", text)]
    deadlines = [m.group() for m in re.finditer(r"\b(\d{1,2}/\d{1,2}/\d{2,4}|\d{1,2} \w+ \d{4})\b", text, flags=re.IGNORECASE)]
    criteria = [m.group(1) for m in re.finditer(r"Crit[eè]res?:\s*(.+)", text, flags=re.IGNORECASE)]
    locations = [m.group(1) for m in re.finditer(r"(?:Lieu|Adresse|Ville)\s*:\s*([^\n]+)", text, flags=re.IGNORECASE)]
    return {
        "amounts": amounts[:10],
        "deadlines": deadlines[:10],
        "criteria": criteria[:10],
        "locations": locations[:10],
    }

@router.post('/extract')
async def extract(files: List[UploadFile] = File(...)):
    results = []
    for f in files:
        data = await f.read()
        text = ""
        if f.filename.lower().endswith('.pdf'):
            text = extract_text_from_pdf(data)
        else:
            text = extract_text_from_image(data)
        meta = heuristic_extract(text)
        results.append({"filename": f.filename, "textPreview": text[:5000], **meta})
    return {"documents": results}

