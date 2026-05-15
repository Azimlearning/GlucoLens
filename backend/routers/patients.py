"""
Patient management endpoints (dietitian-facing).

GET /api/patients              — caseload for the logged-in dietitian
GET /api/patients/{patient_id} — detailed profile for one patient
"""
from fastapi import APIRouter, Depends, HTTPException, status

from backend.agents import dashboard_agent
from backend.middleware.auth import require_user
from backend.tools import firebase_tools

router = APIRouter()


@router.get("")
async def my_caseload(user: dict = Depends(require_user)):
    # Anyone authenticated can call this; for non-dietitians the result is empty.
    caseload = dashboard_agent.fetch_dietitian_caseload(user["uid"])
    return {"caseload": caseload}


@router.get("/{patient_id}")
async def patient_detail(patient_id: str, user: dict = Depends(require_user)):
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    if user["uid"] != patient_id and profile.get("assigned_dietitian") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to view this patient.",
        )
    user_doc = firebase_tools.fetch_user(patient_id) or {}
    return {"user": user_doc, "profile": profile}
