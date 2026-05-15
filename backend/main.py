import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.config import settings
from backend.utils.logging import configure_logging
from backend.routers import health, meals, glucose, misinfo, reports, dashboard, alerts, patients, scheduling


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield


app = FastAPI(title="GlucoLens API", version="1.0.0", lifespan=lifespan)

_allowed_origins = [settings.FRONTEND_URL]
# In development, also allow the fallback port Next.js uses when 3000 is taken
if settings.APP_ENV == "development":
    _allowed_origins += ["http://localhost:3000", "http://localhost:3001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(_allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    session_id = request.headers.get("X-Session-ID", str(uuid.uuid4()))
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "session_id": session_id},
    )


app.include_router(health.router)
app.include_router(meals.router, prefix="/api/v1")
app.include_router(glucose.router, prefix="/api/v1")
app.include_router(misinfo.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1/alerts")
app.include_router(patients.router, prefix="/api/v1/patients")
app.include_router(scheduling.router, prefix="/api/v1")
