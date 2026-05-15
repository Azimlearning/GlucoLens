"""
Glucose entry endpoint.

POST /api/glucose/entry
Body: { glucose_value: float, context: str, timestamp?: str }
Auth: Bearer <firebase_id_token>
"""
from uuid import uuid4

from fastapi import APIRouter, Depends

from backend.agents.orchestrator import run as orchestrator_run
from backend.middleware.auth import require_user
from backend.models.requests import GlucoseEntryRequest
from backend.models.responses import GlucoseEntryResponse
from backend.models.state import EMPTY_STATE
from backend.tools import firebase_tools
from backend.tools.normalize import now_iso

router = APIRouter()


@router.post("/entry", response_model=GlucoseEntryResponse)
async def submit_glucose(payload: GlucoseEntryRequest, user: dict = Depends(require_user)):
    uid = user["uid"]
    ts = payload.timestamp or now_iso()

    # Persist the reading first so downstream agents see it
    reading_id = uuid4().hex
    firebase_tools.firestore_client() \
        .collection("patients").document(uid) \
        .collection("glucose").document(reading_id) \
        .set({
            "id":         reading_id,
            "value_mmol": payload.glucose_value,
            "context":    payload.context,
            "timestamp":  ts,
        })

    state = {
        **EMPTY_STATE,
        "event_type":      "glucose_entry",
        "patient_id":      uid,
        "user_id":         uid,
        "glucose_value":   payload.glucose_value,
        "glucose_context": payload.context,
        "timestamp":       ts,
    }
    final = await orchestrator_run(state)
    return GlucoseEntryResponse(
        session_id=final.get("session_id", ""),
        glucose_insights=final.get("glucose_insights") or [],
        alerts=final.get("alerts") or [],
        errors=final.get("errors") or [],
    )
