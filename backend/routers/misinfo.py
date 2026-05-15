import uuid
from fastapi import APIRouter, Depends
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import MisinfoQueryRequest
from backend.models.responses import MisinfoQueryResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/misinfo", tags=["misinfo"])


@router.post("/check", response_model=MisinfoQueryResponse)
async def check_misinfo(body: MisinfoQueryRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("misinformation_query", {
        "session_id": session_id,
        "user_id": uid,
        "claim_text": body.claim_text,
    })
    if result.get("errors"):
        return MisinfoQueryResponse(success=False, error=str(result["errors"]))
    return MisinfoQueryResponse(
        success=True,
        verdict=result.get("verdict"),
        evidence_summary=result.get("evidence_summary"),
        sources=result.get("misinfo_sources"),
    )
