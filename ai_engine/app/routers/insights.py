from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Profitability(BaseModel):
    revenue: float
    cost: float
    margin: float
    marginRate: float

@router.post('/finance/insights')
def insights(p: Profitability):
    hints = []
    if p.marginRate < 0.1:
        hints.append("Marge faible: renégocier achats, ajuster prix.")
    elif p.marginRate < 0.25:
        hints.append("Marge correcte: surveiller coûts variables.")
    else:
        hints.append("Marge solide: optimiser délais pour cashflow.")
    if p.margin < 0:
        hints.append("Marge négative: geler projets non rentables.")
    return {"summary": f"Marge {p.margin:.2f} ({p.marginRate*100:.1f}%).", "actions": hints}

