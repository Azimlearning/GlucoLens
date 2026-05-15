"""
Misinformation query endpoint.

POST /api/misinfo/query
Body: { raw_query: str }
Auth: Bearer <firebase_id_token>
"""
from fastapi import APIRouter, Depends

from backend.agents.orchestrator import run as orchestrator_run
from backend.middleware.auth import require_user
from backend.models.requests import MisinfoRequest
from backend.models.responses import MisinfoResponse
from backend.models.state import EMPTY_STATE
from backend.tools.normalize import now_iso

router = APIRouter()


@router.post("/query", response_model=MisinfoResponse)
async def submit_query(payload: MisinfoRequest, user: dict = Depends(require_user)):
    state = {
        **EMPTY_STATE,
        "event_type": "misinformation_query",
        "patient_id": user["uid"],
        "user_id":    user["uid"],
        "raw_query":  payload.raw_query,
        "timestamp":  now_iso(),
    }
    final = await orchestrator_run(state)
    return MisinfoResponse(
        session_id=final.get("session_id", ""),
        verdict=final.get("verdict", "error"),
        verdict_explanation=final.get("verdict_explanation", ""),
        disclaimer=final.get("disclaimer", ""),
        evidence_sources=final.get("evidence_sources") or [],
        errors=final.get("errors") or [],
    )
