"""
Meal upload endpoint.

POST /api/meal/upload
Body: { image_base64: str }
Auth: Bearer <firebase_id_token>
"""
from fastapi import APIRouter, Depends

from backend.agents.orchestrator import run as orchestrator_run
from backend.middleware.auth import require_user
from backend.models.requests import MealUploadRequest
from backend.models.responses import MealUploadResponse, NutritionTotals, TrafficLight
from backend.models.state import EMPTY_STATE
from backend.tools.normalize import now_iso

router = APIRouter()


@router.post("/upload", response_model=MealUploadResponse)
async def upload_meal(payload: MealUploadRequest, user: dict = Depends(require_user)):
    state = {
        **EMPTY_STATE,
        "event_type":   "meal_upload",
        "patient_id":   user["uid"],   # JWT UID overrides anything client-side
        "user_id":      user["uid"],
        "image_base64": payload.image_base64,
        "timestamp":    now_iso(),
    }
    final = await orchestrator_run(state)

    totals = final.get("nutrition_totals") or {}
    tl = final.get("traffic_light") or {}
    return MealUploadResponse(
        session_id=final.get("session_id", ""),
        meal_items=final.get("meal_items") or [],
        nutrition_totals=NutritionTotals(**{k: float(v) for k, v in totals.items()
                                            if k in NutritionTotals.model_fields}),
        traffic_light=TrafficLight(**{k: v for k, v in tl.items()
                                      if k in TrafficLight.model_fields}),
        risk_score=int(final.get("risk_score") or 0),
        recommendations=final.get("recommendations") or [],
        drug_interactions=final.get("drug_interactions") or [],
        alerts=final.get("alerts") or [],
        dashboard_payload=final.get("dashboard_payload") or {},
        errors=final.get("errors") or [],
    )
