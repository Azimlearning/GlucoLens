import uuid
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import MealUploadRequest, MealConfirmRequest
from backend.models.responses import MealUploadResponse
from backend.agents.orchestrator import run_pipeline
from backend.tools import firebase_tools
from backend.tools.normalize import now_iso

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/upload", response_model=MealUploadResponse)
async def upload_meal(body: MealUploadRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("meal_upload", {
        "session_id": session_id,
        "patient_id": uid,
        "user_id": uid,
        "image_base64": body.image_base64,
        "meal_type": body.meal_type,
    })
    errors = result.get("errors") or []

    # Prefer enriched items (nutrition_per_item has nutrition_per_100g populated)
    enriched_items = result.get("nutrition_per_item") or result.get("meal_items") or []
    nutrition_totals = result.get("nutrition_totals") or {}

    # Persist to Firestore only when not a dry run
    if not body.dry_run and enriched_items:
        meal_id = str(uuid.uuid4())
        meal_name = ", ".join(
            it.get("name", "?") for it in enriched_items[:3] if it.get("name")
        )
        meal_doc = {
            "meal_id": meal_id,
            "patient_id": uid,
            "timestamp": now_iso(),
            "name": meal_name or "Meal",
            "meal_type": body.meal_type,
            "traffic_light": result.get("traffic_light") or {},
            "risk_score": result.get("risk_score") or 0,
            "meal_risk_score": result.get("risk_score") or 0,
            "calories": round(nutrition_totals.get("calories_kcal", 0)),
            "carbs_g": round(nutrition_totals.get("carbs_g", 0)),
            "nutrition_totals": nutrition_totals,
            "meal_items": enriched_items,
            "recommendations": result.get("recommendations") or [],
            "drug_interactions": result.get("drug_interactions") or [],
        }
        try:
            firebase_tools.write_patient_meal(uid, meal_id, meal_doc)
        except Exception:
            pass  # Non-fatal — response still succeeds

    return MealUploadResponse(
        success=len(errors) == 0,
        session_id=result.get("session_id") or session_id,
        meal_items=enriched_items,
        nutrition_totals=nutrition_totals,
        traffic_light=result.get("traffic_light") or {},
        risk_score=result.get("risk_score") or 0,
        recommendations=result.get("recommendations") or [],
        drug_interactions=result.get("drug_interactions") or [],
        alerts=result.get("alerts") or [],
        dashboard_payload=result.get("dashboard_payload") or {},
        errors=errors,
    )


@router.get("/{meal_id}")
async def get_meal(meal_id: str, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    db = firebase_tools.firestore_client()
    doc = db.collection("patients").document(uid).collection("meals").document(meal_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"success": True, "meal": doc.to_dict()}


@router.delete("/{meal_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_meal(meal_id: str, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    db = firebase_tools.firestore_client()
    db.collection("patients").document(uid).collection("meals").document(meal_id).delete()


@router.post("/confirm")
async def confirm_meal(body: MealConfirmRequest, user: dict = Depends(verify_firebase_jwt)):
    """Save a previously analysed (dry-run) meal to Firestore after patient confirms."""
    uid = user["uid"]
    meal_id = str(uuid.uuid4())
    totals = body.nutrition_totals
    meal_doc = {
        "meal_id":        meal_id,
        "patient_id":     uid,
        "timestamp":      now_iso(),
        "name":           body.meal_name or "Meal",
        "meal_type":      body.meal_type,
        "traffic_light":  body.traffic_light,
        "risk_score":     body.risk_score,
        "meal_risk_score": body.risk_score,
        "calories":       round(totals.get("calories_kcal", 0)),
        "carbs_g":        round(totals.get("carbs_g", 0)),
        "nutrition_totals": totals,
        "meal_items":     body.meal_items,
        "recommendations": body.recommendations,
        "drug_interactions": body.drug_interactions,
        "swap_suggestions": body.applied_swaps,
    }
    firebase_tools.write_patient_meal(uid, meal_id, meal_doc)
    return {"success": True, "meal_id": meal_id}
