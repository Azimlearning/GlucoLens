"""
Dashboard payload endpoint.

GET /api/dashboard/me  — payload tailored to the logged-in user's role.
Auth: Bearer <firebase_id_token>
"""
from fastapi import APIRouter, Depends

from backend.agents.orchestrator import run as orchestrator_run
from backend.middleware.auth import require_user
from backend.models.responses import DashboardResponse
from backend.models.state import EMPTY_STATE
from backend.tools.normalize import now_iso

router = APIRouter()


@router.get("/me", response_model=DashboardResponse)
async def my_dashboard(user: dict = Depends(require_user)):
    state = {
        **EMPTY_STATE,
        "event_type": "dashboard_load",
        "user_id":    user["uid"],
        "patient_id": user["uid"],
        "timestamp":  now_iso(),
    }
    final = await orchestrator_run(state)
    return DashboardResponse(
        session_id=final.get("session_id", ""),
        dashboard_payload=final.get("dashboard_payload") or {},
        view_role=final.get("view_role", "patient"),
        errors=final.get("errors") or [],
    )
