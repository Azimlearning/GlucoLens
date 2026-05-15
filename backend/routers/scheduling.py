"""
Meeting scheduling / clinical agenda endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from backend.middleware.auth import require_user
from backend.tools import firebase_tools
from backend.agents import scheduling_agent

router = APIRouter(prefix="/scheduling", tags=["scheduling"])


@router.post("/meeting-plan/{patient_id}")
async def generate_meeting_plan(
    patient_id: str,
    user: dict = Depends(require_user),
):
    """Generate a clinical meeting agenda for a patient.

    Accessible by:
    - The patient themselves (self-view)
    - Their assigned dietitian
    """
    uid = user["uid"]
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    assigned_dietitian = profile.get("assigned_dietitian")

    if uid != patient_id and uid != assigned_dietitian:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to generate a meeting plan for this patient.",
        )

    plan = scheduling_agent.generate_meeting_plan(patient_id)
    return {"success": True, "meeting_plan": plan}
