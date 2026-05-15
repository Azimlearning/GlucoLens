"""
GlucoLens backend entrypoint.

Run locally:
    uvicorn backend.main:app --reload --port 8000

The agent framework is the core deliverable. Routers below are thin handlers that
build a state dict and hand off to `orchestrator.run`.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.models.responses import HealthResponse
from backend.routers import meal, glucose, misinfo, report, dashboard, alerts, patients


app = FastAPI(
    title="GlucoLens API",
    version="1.0.0",
    description="Multi-agent clinical nutrition companion for Malaysian T2DM patients.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=app.version)


# Routers — each is a thin handler that constructs state and calls orchestrator.run
app.include_router(meal.router,      prefix="/api/meal",      tags=["meal"])
app.include_router(glucose.router,   prefix="/api/glucose",   tags=["glucose"])
app.include_router(misinfo.router,   prefix="/api/misinfo",   tags=["misinfo"])
app.include_router(report.router,    prefix="/api/report",    tags=["report"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["alerts"])
app.include_router(patients.router,  prefix="/api/patients",  tags=["patients"])
