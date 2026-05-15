"""
Pydantic request models for FastAPI endpoints.
"""
from typing import Optional
from pydantic import BaseModel, Field


class MealUploadRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded JPG/PNG image bytes (no data: prefix).")


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
