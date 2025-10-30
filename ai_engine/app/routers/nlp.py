from fastapi import APIRouter
from pydantic import BaseModel
import re

router = APIRouter()

class Text(BaseModel):
    text: str

@router.post('/summarize')
def summarize(t: Text):
    # naive summarization: first 2 sentences, or trimmed
    sentences = re.split(r'(?<=[\.!?])\s+', t.text.strip())
    summary = ' '.join(sentences[:2]) if sentences else t.text[:280]
    return { 'summary': summary }

@router.post('/detect_lang')
def detect_lang(t: Text):
    s = t.text
    # very naive: Arabic unicode range
    if re.search(r'[\u0600-\u06FF]', s):
        return { 'lang': 'ar' }
    # simple accents -> fr
    if re.search(r'[éèàùçôî]', s.lower()):
        return { 'lang': 'fr' }
    return { 'lang': 'en' }

class Translate(BaseModel):
    text: str
    targetLang: str

@router.post('/translate')
def translate(x: Translate):
    # placeholder: return original; integrate real MT later
    return { 'text': x.text, 'targetLang': x.targetLang }

