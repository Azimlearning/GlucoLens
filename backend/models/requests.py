from pydantic import BaseModel, Field
from typing import Optional


class MealUploadRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded JPG or PNG")
    patient_id: Optional[str] = None  # overridden by JWT uid in router


class GlucoseEntryRequest(BaseModel):
    value_mmol: float = Field(..., ge=1.0, le=30.0)
    timestamp: Optional[str] = None   # ISO 8601; defaults to now if omitted
    meal_id: Optional[str] = None
    patient_id: Optional[str] = None


class MisinfoQueryRequest(BaseModel):
    claim_text: str = Field(..., min_length=5, max_length=2000)
    url: Optional[str] = None


class WeeklyReportRequest(BaseModel):
    patient_id: Optional[str] = None  # overridden by JWT uid


class DashboardLoadRequest(BaseModel):
    patient_id: Optional[str] = None  # dietitian may supply a specific patient
