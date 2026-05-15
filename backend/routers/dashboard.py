import uuid
from fastapi import APIRouter, Depends, Query
from backend.middleware.auth import verify_firebase_jwt
from backend.models.responses import DashboardResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    patient_id: str | None = Query(None),
    user: dict = Depends(verify_firebase_jwt),
):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("dashboard_load", {
        "session_id": session_id,
        "user_id": uid,
        "patient_id": patient_id or uid,
    })
    errors = result.get("errors") or []
    return DashboardResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        dashboard_payload=result.get("dashboard_payload") or {},
        view_role=result.get("view_role") or "patient",
        errors=errors,
    )
