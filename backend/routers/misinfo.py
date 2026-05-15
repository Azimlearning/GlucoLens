import uuid
from fastapi import APIRouter, Depends
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import MisinfoRequest
from backend.models.responses import MisinfoResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/misinfo", tags=["misinfo"])


@router.post("/check", response_model=MisinfoResponse)
async def check_misinfo(body: MisinfoRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("misinformation_query", {
        "session_id": session_id,
        "patient_id": uid,
        "user_id": uid,
        "raw_query": body.raw_query,
    })
    errors = result.get("errors") or []
    return MisinfoResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        verdict=result.get("verdict") or "",
        verdict_explanation=result.get("verdict_explanation") or "",
        disclaimer=result.get("disclaimer") or "",
        evidence_sources=result.get("evidence_sources") or [],
        errors=errors,
    )
