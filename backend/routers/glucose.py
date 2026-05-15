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
        "patient_id": uid,
        "user_id": uid,
        "glucose_value": body.glucose_value,
        "glucose_context": body.context,
        "timestamp": timestamp,
    })
    errors = result.get("errors") or []
    return GlucoseEntryResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        glucose_insights=result.get("glucose_insights") or [],
        alerts=result.get("alerts") or [],
        errors=errors,
    )
