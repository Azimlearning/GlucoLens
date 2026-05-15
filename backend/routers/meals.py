import uuid
from fastapi import APIRouter, Depends
from backend.middleware.auth import verify_firebase_jwt
from backend.models.requests import MealUploadRequest
from backend.models.responses import MealUploadResponse
from backend.agents.orchestrator import run_pipeline

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/upload", response_model=MealUploadResponse)
async def upload_meal(body: MealUploadRequest, user: dict = Depends(verify_firebase_jwt)):
    uid = user["uid"]
    session_id = str(uuid.uuid4())
    result = await run_pipeline("meal_upload", {
        "session_id": session_id,
        "user_id": uid,
        "image_base64": body.image_base64,
    })
    if result.get("errors"):
        return MealUploadResponse(success=False, error=str(result["errors"]))
    return MealUploadResponse(
        success=True,
        meal_id=result.get("meal_id"),
        traffic_light=result.get("traffic_light"),
        meal_totals=result.get("meal_totals"),
        swap_suggestions=result.get("swap_suggestions"),
        alerts=result.get("alerts"),
    )
