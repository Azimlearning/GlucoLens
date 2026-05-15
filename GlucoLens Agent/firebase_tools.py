"""
Firebase Admin SDK wrapper.

Initializes once on import. Exposes:
  - firestore_client()  -> firestore.Client
  - rtdb_ref(path)      -> db.Reference
  - storage_bucket()    -> storage.Bucket
  - verify_id_token(t)  -> dict (decoded token)

All agent and router code should go through this module — never instantiate clients directly.
"""
from datetime import timedelta
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore, db as rtdb_module, storage, auth

from backend.config import settings
from backend.utils.logging import agent_logger

log = agent_logger("firebase")

_app: Optional[firebase_admin.App] = None
_firestore_client: Optional[Any] = None


def _init_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app
    # Newlines in PEM keys can be escaped in .env — undo that.
    private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": settings.FIREBASE_PROJECT_ID,
        "private_key": private_key,
        "client_email": settings.FIREBASE_CLIENT_EMAIL,
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    _app = firebase_admin.initialize_app(cred, {
        "databaseURL": settings.FIREBASE_DATABASE_URL,
        "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
    })
    log.info("firebase_initialized", project=settings.FIREBASE_PROJECT_ID)
    return _app


def firestore_client():
    """Return a singleton Firestore client."""
    global _firestore_client
    _init_app()
    if _firestore_client is None:
        _firestore_client = firestore.client()
    return _firestore_client


def rtdb_ref(path: str):
    """Return a Realtime Database Reference at the given path."""
    _init_app()
    return rtdb_module.reference(path)


def storage_bucket():
    """Return the default Storage bucket."""
    _init_app()
    return storage.bucket()


def verify_id_token(token: str) -> dict:
    """Verify a Firebase Auth ID token. Returns the decoded token dict (uid, email, etc.)."""
    _init_app()
    return auth.verify_id_token(token)


# === High-level helpers used by agents ===

def fetch_user(uid: str) -> Optional[dict]:
    doc = firestore_client().collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


def fetch_patient_profile(patient_id: str) -> Optional[dict]:
    doc = firestore_client().collection("patients").document(patient_id) \
        .collection("profile").document("main").get()
    return doc.to_dict() if doc.exists else None


def write_patient_meal(patient_id: str, meal_id: str, payload: dict) -> None:
    firestore_client().collection("patients").document(patient_id) \
        .collection("meals").document(meal_id).set(payload)


def write_patient_alert(patient_id: str, alert_id: str, payload: dict) -> None:
    firestore_client().collection("patients").document(patient_id) \
        .collection("alerts").document(alert_id).set(payload)


def write_misinfo_log(patient_id: str, query_id: str, payload: dict) -> None:
    firestore_client().collection("patients").document(patient_id) \
        .collection("misinfo_log").document(query_id).set(payload)


def write_audit_log(session_id: str, payload: dict) -> None:
    firestore_client().collection("audit_logs").document(session_id).set(payload)


def push_realtime(channel: str, payload: dict) -> None:
    rtdb_ref(channel).set(payload)


def push_realtime_child(channel: str, child_id: str, payload: dict) -> None:
    rtdb_ref(f"{channel}/{child_id}").set(payload)


def upload_bytes_to_storage(path: str, data: bytes, content_type: str,
                            signed_url_days: int = 7) -> str:
    bucket = storage_bucket()
    blob = bucket.blob(path)
    blob.upload_from_string(data, content_type=content_type)
    return blob.generate_signed_url(
        expiration=timedelta(days=signed_url_days), method="GET")
