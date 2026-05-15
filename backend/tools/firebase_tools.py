import firebase_admin
from firebase_admin import credentials, firestore, auth, db, storage
from backend.config import settings
import structlog

log = structlog.get_logger(module="firebase_tools")

_app = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is None:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": settings.firebase_private_key.replace("\n", "\n"),
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        _app = firebase_admin.initialize_app(cred, {
            "databaseURL": settings.firebase_database_url,
            "storageBucket": settings.firebase_storage_bucket,
        })
    return _app


def firestore_client():
    _get_app()
    return firestore.client()


def rtdb_ref(path: str):
    _get_app()
    return db.reference(path)


def storage_bucket():
    _get_app()
    return storage.bucket()


def verify_token(id_token: str) -> dict | None:
    try:
        _get_app()
        return auth.verify_id_token(id_token)
    except Exception as e:
        log.warning("token_verification_failed", error=str(e))
        return None


def firestore_get(collection: str, doc_id: str) -> dict | None:
    doc = firestore_client().collection(collection).document(doc_id).get()
    return doc.to_dict() if doc.exists else None


def firestore_set(collection: str, doc_id: str, data: dict) -> None:
    firestore_client().collection(collection).document(doc_id).set(data)


def firestore_update(collection: str, doc_id: str, data: dict) -> None:
    firestore_client().collection(collection).document(doc_id).update(data)


def firestore_add(collection: str, data: dict) -> str:
    _, ref = firestore_client().collection(collection).add(data)
    return ref.id


def rtdb_set(path: str, data: dict) -> None:
    rtdb_ref(path).set(data)


def rtdb_push(path: str, data: dict) -> str:
    ref = rtdb_ref(path).push(data)
    return ref.key


def storage_upload(blob_path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    bucket = storage_bucket()
    blob = bucket.blob(blob_path)
    blob.upload_from_string(data, content_type=content_type)
    blob.make_public()
    return blob.public_url
