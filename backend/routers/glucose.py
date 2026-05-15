import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import GlucoseEntryRequest
from backend.models.responses import GlucoseEntryResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/glucose", tags=["glucose"])


@router.post("/entry", response_model=GlucoseEntryResponse)
async def log_glucose(body: GlucoseEntryRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    timestamp = body.timestamp or datetime.now(timezone.utc).isoformat()
    result = await run_pipeline("glucose_entry", {
        "session_id": session_id,
        "user_id": uid,
        "glucose_readings": [{"value_mmol": body.value_mmol, "timestamp": timestamp, "meal_id": body.meal_id or ""}],
    })
    if result.get("errors"):
        return GlucoseEntryResponse(success=False, error=str(result["errors"]))
    return GlucoseEntryResponse(
        success=True,
        insight=result.get("glucose_insight"),
        alerts=result.get("alerts"),
    )
