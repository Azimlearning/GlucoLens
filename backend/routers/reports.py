import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import WeeklyReportRequest
from backend.models.responses import WeeklyReportResponse
from backend.agents.orchestrator import run_pipeline
from backend.agents import report_agent
from backend.tools import firebase_tools

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/weekly", response_model=WeeklyReportResponse)
async def generate_weekly_report(_body: WeeklyReportRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("weekly_report", {
        "session_id": session_id,
        "patient_id": uid,
        "user_id": uid,
    })
    errors = result.get("errors") or []
    return WeeklyReportResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        pdf_url=result.get("pdf_url") or "",
        errors=errors,
    )


@router.get("/download")
async def download_weekly_report(user: dict = Depends(verify_firebase_jwt)):
    """Generate and stream the PDF directly — no Firebase Storage needed."""
    uid = user["uid"]
    pdf_bytes = await asyncio.to_thread(_build_pdf_for_patient, uid)
    filename = f"glucolens_weekly_{uid[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/weekly/{patient_id}", response_model=WeeklyReportResponse)
async def generate_weekly_report_for_patient(
    patient_id: str,
    user: dict = Depends(verify_firebase_jwt),
):
    """Dietitian generates a report for a specific patient."""
    uid = user["uid"]
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    assigned_dietitian = profile.get("assigned_dietitian")
    if uid != patient_id and uid != assigned_dietitian:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to generate a report for this patient.",
        )
    session_id = str(uuid.uuid4())
    result = await run_pipeline("weekly_report", {
        "session_id": session_id,
        "patient_id": patient_id,
        "user_id": uid,
    })
    errors = result.get("errors") or []
    return WeeklyReportResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        pdf_url=result.get("pdf_url") or "",
        errors=errors,
    )


@router.get("/download/{patient_id}")
async def download_weekly_report_for_patient(
    patient_id: str,
    user: dict = Depends(verify_firebase_jwt),
):
    """Dietitian downloads a patient's PDF directly."""
    uid = user["uid"]
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    assigned_dietitian = profile.get("assigned_dietitian")
    if uid != patient_id and uid != assigned_dietitian:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to download this patient's report.",
        )
    pdf_bytes = await asyncio.to_thread(_build_pdf_for_patient, patient_id)
    filename = f"glucolens_weekly_{patient_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_pdf_for_patient(patient_id: str) -> bytes:
    """Synchronous PDF build — runs in a thread via asyncio.to_thread."""
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    user = firebase_tools.fetch_user(patient_id) or {}
    meals = report_agent.fetch_week_meals(patient_id)
    alerts = report_agent.fetch_alert_history(patient_id)
    misinfo = report_agent.fetch_misinformation_queries(patient_id)

    summary = report_agent.calculate_week_summary(meals, profile.get("targets", {}))
    chart_png = report_agent.generate_trend_chart(meals, profile.get("targets", {})) if meals else b""

    return report_agent.compile_pdf_report({
        "patient_name": user.get("displayName", user.get("name", "Patient")),
        "profile":      profile,
        "summary":      summary,
        "chart_png":    chart_png,
        "alerts":       alerts,
        "misinfo":      misinfo,
        "week_range":   report_agent._format_week_range(),
    })
