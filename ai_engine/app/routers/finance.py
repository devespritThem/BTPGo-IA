from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Line(BaseModel):
    label: str
    amount: float

class Budget(BaseModel):
    lines: list[Line]

@router.post("/budget/summary")
def budget_summary(budget: Budget):
    total = sum(l.amount for l in budget.lines)
    return {"total": total, "count": len(budget.lines)}

