"""
Pydantic response models. Shapes mirror what agents produce.
"""
from typing import Optional
from pydantic import BaseModel


class TrafficLight(BaseModel):
    carbs: str = "green"
    gl: str = "green"
    sodium: str = "green"
    protein: str = "green"


class NutritionTotals(BaseModel):
    calories_kcal: float = 0
    carbs_g: float = 0
    protein_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sodium_mg: float = 0
    glycemic_load: float = 0


class MealUploadResponse(BaseModel):
    session_id: str
    meal_items: list[dict] = []
    nutrition_totals: NutritionTotals = NutritionTotals()
    traffic_light: TrafficLight = TrafficLight()
    risk_score: int = 0
    recommendations: list[str] = []
    drug_interactions: list[dict] = []
    alerts: list[dict] = []
    dashboard_payload: dict = {}
    errors: list[dict] = []


class MisinfoResponse(BaseModel):
    session_id: str
    verdict: str
    verdict_explanation: str
    disclaimer: str
    evidence_sources: list[dict] = []
    errors: list[dict] = []


class WeeklyReportResponse(BaseModel):
    session_id: str
    pdf_url: str
    errors: list[dict] = []


class DashboardResponse(BaseModel):
    session_id: str
    dashboard_payload: dict
    view_role: str
    errors: list[dict] = []


class GlucoseEntryResponse(BaseModel):
    session_id: str
    glucose_insights: list[dict] = []
    alerts: list[dict] = []
    errors: list[dict] = []


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
