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
    # Dietitians may request a specific patient; patients always get their own
    target_patient = patient_id if patient_id and user.get("role") == "dietitian" else uid
    result = await run_pipeline("dashboard_load", {
        "session_id": session_id,
        "user_id": uid,
        "patient_profile": {"uid": target_patient},
    })
    if result.get("errors"):
        return DashboardResponse(success=False, error=str(result["errors"]))
    role = user.get("role", "patient")
    view = result.get("dietitian_view") if role == "dietitian" else result.get("patient_view")
    return DashboardResponse(success=True, view=view)
