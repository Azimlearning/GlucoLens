from pydantic import BaseModel
from typing import Optional, Any


class BaseResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


class MealUploadResponse(BaseResponse):
    meal_id: Optional[str] = None
    traffic_light: Optional[str] = None
    meal_totals: Optional[dict] = None
    swap_suggestions: Optional[list] = None
    alerts: Optional[list] = None


class GlucoseEntryResponse(BaseResponse):
    reading_id: Optional[str] = None
    insight: Optional[dict] = None
    alerts: Optional[list] = None


class MisinfoQueryResponse(BaseResponse):
    verdict: Optional[str] = None
    evidence_summary: Optional[str] = None
    sources: Optional[list] = None


class WeeklyReportResponse(BaseResponse):
    report_url: Optional[str] = None
    week_summary: Optional[dict] = None


class DashboardResponse(BaseResponse):
    view: Optional[dict] = None
