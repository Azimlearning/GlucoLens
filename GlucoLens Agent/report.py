"""
Weekly report generation endpoint.

POST /api/report/weekly        — for the logged-in patient
POST /api/report/weekly/{pid}  — for a dietitian fetching a specific patient
Auth: Bearer <firebase_id_token>
"""
from fastapi import APIRouter, Depends, HTTPException, status

from backend.agents.orchestrator import run as orchestrator_run
from backend.middleware.auth import require_user
from backend.models.responses import WeeklyReportResponse
from backend.models.state import EMPTY_STATE
from backend.tools import firebase_tools
from backend.tools.normalize import now_iso

router = APIRouter()


@router.post("/weekly", response_model=WeeklyReportResponse)
async def generate_for_self(user: dict = Depends(require_user)):
    return await _run(patient_id=user["uid"])


@router.post("/weekly/{patient_id}", response_model=WeeklyReportResponse)
async def generate_for_patient(patient_id: str, user: dict = Depends(require_user)):
    # Only a dietitian who is assigned to this patient may generate their report.
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    if user["uid"] != patient_id and profile.get("assigned_dietitian") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to generate report for this patient.",
        )
    return await _run(patient_id=patient_id)


async def _run(patient_id: str) -> WeeklyReportResponse:
    state = {
        **EMPTY_STATE,
        "event_type": "weekly_report",
        "patient_id": patient_id,
        "user_id":    patient_id,
        "timestamp":  now_iso(),
    }
    final = await orchestrator_run(state)
    return WeeklyReportResponse(
        session_id=final.get("session_id", ""),
        pdf_url=final.get("pdf_url", ""),
        errors=final.get("errors") or [],
    )
