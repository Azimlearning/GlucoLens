import uuid
from fastapi import APIRouter, Depends
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import WeeklyReportRequest
from backend.models.responses import WeeklyReportResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/weekly", response_model=WeeklyReportResponse)
async def generate_weekly_report(body: WeeklyReportRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("weekly_report", {
        "session_id": session_id,
        "user_id": uid,
    })
    if result.get("errors"):
        return WeeklyReportResponse(success=False, error=str(result["errors"]))
    return WeeklyReportResponse(
        success=True,
        report_url=result.get("report_url"),
        week_summary=result.get("week_summary"),
    )
