from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Cost(BaseModel):
    label: str
    amount: float

class Revenue(BaseModel):
    label: str
    amount: float

class SimulationInput(BaseModel):
    revenues: List[Revenue]
    costs: List[Cost]

@router.post('/finance/simulate')
def simulate(inp: SimulationInput):
    revenue = sum(r.amount for r in inp.revenues)
    cost = sum(c.amount for c in inp.costs)
    margin = revenue - cost
    margin_rate = margin / revenue if revenue > 0 else 0
    return {"revenue": revenue, "cost": cost, "margin": margin, "marginRate": margin_rate}

