"""
Alerts endpoints.

POST /api/alerts/seen   — mark a batch of alerts as seen
GET  /api/alerts/recent — list recent alerts for the logged-in user
"""
from fastapi import APIRouter, Depends

from backend.middleware.auth import require_user
from backend.models.requests import AlertSeenRequest
from backend.tools import firebase_tools

router = APIRouter()


@router.post("/seen")
async def mark_seen(payload: AlertSeenRequest, user: dict = Depends(require_user)):
    uid = user["uid"]
    db = firebase_tools.firestore_client()
    batch = db.batch()
    for alert_id in payload.alert_ids:
        batch.update(
            db.collection("patients").document(uid).collection("alerts").document(alert_id),
            {"seen": True},
        )
        # Also clear from RTDB feed
        firebase_tools.rtdb_ref(f"/dashboard/{uid}/alerts/{alert_id}").update({"seen": True})
    batch.commit()
    return {"updated": len(payload.alert_ids)}


@router.get("/recent")
async def recent_alerts(limit: int = 20, user: dict = Depends(require_user)):
    uid = user["uid"]
    coll = firebase_tools.firestore_client() \
        .collection("patients").document(uid).collection("alerts") \
        .order_by("timestamp", direction="DESCENDING").limit(limit)
    return {"alerts": [doc.to_dict() for doc in coll.stream()]}
