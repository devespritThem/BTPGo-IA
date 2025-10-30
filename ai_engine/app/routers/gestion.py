from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Task(BaseModel):
    title: str
    status: str = "todo"

@router.post("/tasks/validate")
def validate_task(task: Task):
    if len(task.title.strip()) < 3:
        return {"valid": False, "reason": "Title too short"}
    if task.status not in {"todo", "doing", "done"}:
        return {"valid": False, "reason": "Invalid status"}
    return {"valid": True}

