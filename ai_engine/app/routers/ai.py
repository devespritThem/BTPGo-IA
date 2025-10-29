from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Prompt(BaseModel):
    text: str

@router.post("/prompt")
def generate(prompt: Prompt):
    return {"result": f"Echo: {prompt.text}"}

class WeatherDay(BaseModel):
    date: str
    condition: str  # clear, rain, wind, storm

class Task(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    durationDays: int
    dependsOn: List[str] = []

class ProjectPlan(BaseModel):
    projectId: str
    tasks: List[Task]

class ScheduleInput(BaseModel):
    projects: List[ProjectPlan]
    weather: List[WeatherDay] = []
    startDate: Optional[str] = None

@router.post('/planning/schedule')
def schedule(inp: ScheduleInput):
    # Heuristic scheduler: topological order, push outdoor tasks on non-rainy days
    from datetime import datetime, timedelta
    start = datetime.fromisoformat((inp.startDate or '2025-01-01') + 'T00:00:00')
    weather_map = {w.date: w.condition for w in inp.weather}
    out = []
    for proj in inp.projects:
        # topo sort
        tasks = {t.id: t for t in proj.tasks}
        done = set()
        day = start
        schedule = {}
        remaining = set(tasks.keys())
        while remaining:
            progressed = False
            for tid in list(remaining):
                t = tasks[tid]
                if all(d in done for d in t.dependsOn):
                    # find earliest slot
                    s = day
                    if (t.category or '').lower() == 'outdoor':
                        # skip rainy days
                        while weather_map.get(s.date().isoformat(), '') in ('rain', 'storm'):
                            s += timedelta(days=1)
                    e = s + timedelta(days=t.durationDays)
                    schedule[tid] = {"start": s.date().isoformat(), "end": (e - timedelta(days=1)).date().isoformat()}
                    day = e
                    done.add(tid)
                    remaining.remove(tid)
                    progressed = True
            if not progressed:
                # cycle or blocked: push a day
                day += timedelta(days=1)
        out.append({"projectId": proj.projectId, "tasks": schedule})
    return {"schedule": out}

class ForecastInput(BaseModel):
    projects: List[ProjectPlan]

@router.post('/planning/forecast')
def forecast(inp: ForecastInput):
    # Simple risk scoring: more dependencies and outdoor tasks => higher delay risk
    results = []
    for proj in inp.projects:
        outdoor = sum(1 for t in proj.tasks if (t.category or '').lower() == 'outdoor')
        deps = sum(len(t.dependsOn) for t in proj.tasks)
        duration = sum(t.durationDays for t in proj.tasks)
        risk = min(1.0, 0.2 + 0.02*deps + 0.01*outdoor + 0.0005*duration)
        results.append({"projectId": proj.projectId, "risk": risk, "predictedDurationDays": duration})
    return {"projects": results}
