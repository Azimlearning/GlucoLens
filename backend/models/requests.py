"""
Pydantic request models for FastAPI endpoints.
"""
from typing import Optional
from pydantic import BaseModel, Field


class MealUploadRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded JPG/PNG image bytes (no data: prefix).")
    meal_type: str = Field("unspecified", description="breakfast | lunch | dinner | snack | unspecified")
    dry_run: bool = Field(True, description="If True, analyse only — do not persist to Firestore. Call /meals/confirm to save.")


class MealConfirmRequest(BaseModel):
    meal_name: str = Field(..., description="Human-readable meal name derived from items.")
    meal_type: str = Field("unspecified")
    nutrition_totals: dict = Field(..., description="Possibly adjusted nutrition totals.")
    meal_items: list = Field(default_factory=list)
    traffic_light: dict = Field(default_factory=dict)
    risk_score: float = Field(0)
    recommendations: list = Field(default_factory=list)
    drug_interactions: list = Field(default_factory=list)
    applied_swaps: list[str] = Field(default_factory=list, description="Swap suggestions the patient applied.")


class GlucoseEntryRequest(BaseModel):
    glucose_value: float = Field(..., gt=0, le=40, description="Glucose reading in mmol/L.")
    context: str = Field("random", pattern="^(pre_meal|post_meal|fasting|random)$")
    timestamp: Optional[str] = Field(None, description="ISO8601 UTC; server fills in if omitted.")


class MisinfoRequest(BaseModel):
    raw_query: str = Field(..., min_length=3, max_length=2000)


class AlertSeenRequest(BaseModel):
    alert_ids: list[str]


class MisinfoDiscussedRequest(BaseModel):
    query_id: str


class WeeklyReportRequest(BaseModel):
    pass
