"""
Agent 7 — Reflection & Dashboard Agent (UI Brain)

Job: Synthesize outputs from Agents 1-6 into the correct view payload for the
     logged-in user (patient vs dietitian) and push to the live dashboard channel.

This agent is role-aware: same agent outputs become different presentations.

Inputs from state:
  - All other agents' outputs
  - user_id (whoever is currently viewing)

Outputs to state:
  - dashboard_payload: dict
  - view_role: str
"""
from __future__ import annotations

from datetime import datetime, timezone

from backend.models.state import GlucoLensState
from backend.tools import openai_tools, firebase_tools
from backend.tools.prompts import (
    UI_SUMMARY_PATIENT_PROMPT,
    UI_SUMMARY_DIETITIAN_PROMPT,
)
from backend.utils.cache import view_state_cache
from backend.utils.logging import agent_logger

log = agent_logger("dashboard")


# === Tools ===

def fetch_agent_outputs(state: GlucoLensState) -> dict:
    """Collect all agent outputs from the running state."""
    keys = [
        "traffic_light", "risk_score", "recommendations", "drug_interactions",
        "alerts", "glucose_insights",
        "verdict", "verdict_explanation", "disclaimer", "evidence_sources",
        "nutrition_per_item", "nutrition_totals",
        "meal_items", "unrecognized_items",
        "pdf_url",
        "errors",
    ]
    return {k: state.get(k) for k in keys}


def determine_user_role(user_id: str) -> str:
    """Lookup the user's role in Firestore. Defaults to 'patient'."""
    user = firebase_tools.fetch_user(user_id) or {}
    return user.get("role", "patient")


def fetch_dietitian_caseload(dietitian_id: str) -> list[dict]:
    """Find all patients assigned to a dietitian + a snapshot of their state."""
    try:
        # Find all profiles where assigned_dietitian == dietitian_id
        db = firebase_tools.firestore_client()
        results: list[dict] = []
        # Top-level scan over patients/*/profile/main — for the demo this is fine.
        for patient_doc in db.collection("patients").stream():
            pid = patient_doc.id
            profile_doc = db.collection("patients").document(pid) \
                .collection("profile").document("main").get()
            if not profile_doc.exists:
                continue
            profile = profile_doc.to_dict()
            if profile.get("assigned_dietitian") != dietitian_id:
                continue
            user_doc = db.collection("users").document(pid).get()
            user = user_doc.to_dict() if user_doc.exists else {}

            # Compute a rough weekly risk from the most-recent N meals
            meals_snap = db.collection("patients").document(pid).collection("meals") \
                .order_by("timestamp", direction="DESCENDING").limit(10).stream()
            risks = [m.to_dict().get("risk_score", 0) for m in meals_snap]
            weekly_risk = round(sum(risks) / len(risks), 1) if risks else 0

            results.append({
                "patient_id": pid,
                "name": user.get("displayName", ""),
                "hba1c": profile.get("hba1c"),
                "weekly_risk_score": weekly_risk,
                "meals_logged_recent": len(risks),
            })
        return results
    except Exception as e:  # noqa: BLE001
        log.warning("caseload_fetch_failed", error=str(e))
        return []


def fetch_recent_alerts_for_dietitian(dietitian_id: str, limit: int = 20) -> list[dict]:
    """Read recent alerts from RTDB for a dietitian channel."""
    try:
        ref = firebase_tools.rtdb_ref(f"/dashboard/{dietitian_id}/alerts")
        data = ref.get() or {}
        if not isinstance(data, dict):
            return []
        alerts = list(data.values())
        alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
        return alerts[:limit]
    except Exception:  # noqa: BLE001
        return []


def fetch_recent_misinfo_for_dietitian(dietitian_id: str, limit: int = 20) -> list[dict]:
    """Read recent misinfo queries flagged for this dietitian."""
    try:
        # In this build, misinfo queries are written under each patient's misinfo_log.
        # We scan the dietitian's caseload and merge.
        caseload = fetch_dietitian_caseload(dietitian_id)
        all_queries: list[dict] = []
        db = firebase_tools.firestore_client()
        for p in caseload:
            coll = db.collection("patients").document(p["patient_id"]) \
                .collection("misinfo_log") \
                .order_by("timestamp", direction="DESCENDING").limit(10).stream()
            for doc in coll:
                d = doc.to_dict()
                d["patient_name"] = p["name"]
                d["patient_id"] = p["patient_id"]
                all_queries.append(d)
        all_queries.sort(key=lambda q: q.get("timestamp", ""), reverse=True)
        return all_queries[:limit]
    except Exception as e:  # noqa: BLE001
        log.warning("misinfo_fetch_failed", error=str(e))
        return []


def build_patient_view(outputs: dict, patient_id: str) -> dict:
    """Assemble the patient-facing dashboard payload."""
    return {
        "view": "patient",
        "user_id": patient_id,
        "cards": [
            {"type": "traffic_light",       "data": outputs.get("traffic_light") or {}},
            {"type": "meal_breakdown",      "data": outputs.get("nutrition_per_item") or []},
            {"type": "nutrition_totals",    "data": outputs.get("nutrition_totals") or {}},
            {"type": "risk_score",          "data": outputs.get("risk_score") or 0},
            {"type": "recommendations",     "data": outputs.get("recommendations") or []},
            {"type": "drug_interactions",   "data": outputs.get("drug_interactions") or []},
            {"type": "alert_feed",          "data": outputs.get("alerts") or []},
            {"type": "glucose_insights",    "data": outputs.get("glucose_insights") or []},
            {"type": "misinfo_verdict",     "data": _misinfo_card_data(outputs)},
            {"type": "unrecognized_items",  "data": outputs.get("unrecognized_items") or []},
        ],
        "summary": generate_ui_summary(outputs, role="patient"),
        "timestamp": _now_iso(),
    }


def build_dietitian_view(outputs: dict, dietitian_id: str) -> dict:
    """Assemble the dietitian-facing dashboard payload."""
    caseload = fetch_dietitian_caseload(dietitian_id)
    caseload.sort(key=lambda p: p.get("weekly_risk_score", 0), reverse=True)
    return {
        "view": "dietitian",
        "user_id": dietitian_id,
        "caseload": caseload,
        "recent_alerts": fetch_recent_alerts_for_dietitian(dietitian_id),
        "misinfo_log":   fetch_recent_misinfo_for_dietitian(dietitian_id),
        "pdf_url":       outputs.get("pdf_url") or "",
        "summary":       generate_ui_summary(
            {"caseload_size": len(caseload),
             "alerts_recent": len(fetch_recent_alerts_for_dietitian(dietitian_id, limit=50))},
            role="dietitian",
        ),
        "timestamp": _now_iso(),
    }


def push_realtime_to_firebase(channel: str, payload: dict) -> None:
    """Write the payload to RTDB so the frontend listener picks it up."""
    firebase_tools.push_realtime(channel, payload)


def format_for_chart(data: list, chart_type: str) -> list:
    """Transform agent outputs into Recharts-friendly data arrays."""
    if chart_type == "nutrient_breakdown":
        return [
            {"name": "Carbs (g)",      "value": float(data.get("carbs_g", 0))},
            {"name": "Protein (g)",    "value": float(data.get("protein_g", 0))},
            {"name": "Fat (g)",        "value": float(data.get("fat_g", 0))},
            {"name": "Fiber (g)",      "value": float(data.get("fiber_g", 0))},
        ]
    if chart_type == "meal_items":
        return [
            {"name": i.get("name", "?"), "portion": float(i.get("portion_g", 0)),
             "gl": float(i.get("gl", 0))}
            for i in data or []
        ]
    return []


def generate_ui_summary(outputs: dict, role: str) -> str:
    """LLM-driven one-sentence insight string."""
    try:
        if role == "patient":
            condensed = {
                "risk_score":    outputs.get("risk_score"),
                "traffic_light": outputs.get("traffic_light"),
                "alerts_count":  len(outputs.get("alerts") or []),
                "interactions":  len(outputs.get("drug_interactions") or []),
            }
            text = openai_tools.chat_completion(
                system="You write one short friendly sentence. Plain text only.",
                user=UI_SUMMARY_PATIENT_PROMPT.format(results=str(condensed)),
            )
        else:
            text = openai_tools.chat_completion(
                system="You write one short clinical sentence. Plain text only.",
                user=UI_SUMMARY_DIETITIAN_PROMPT.format(stats=str(outputs)),
            )
        return text.strip().strip('"').strip()[:200]
    except Exception:  # noqa: BLE001
        return ""


def cache_view_state(user_id: str, payload: dict) -> None:
    view_state_cache.set(user_id, payload, ttl_s=300)


def localize_strings(text: str, language: str) -> str:
    """Stub. Production hook for a translation service."""
    return text


# === Internal helpers ===

def _misinfo_card_data(outputs: dict) -> dict:
    if not outputs.get("verdict"):
        return {}
    return {
        "verdict":     outputs.get("verdict"),
        "explanation": outputs.get("verdict_explanation"),
        "disclaimer":  outputs.get("disclaimer"),
        "sources":     outputs.get("evidence_sources") or [],
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    user_id = state.get("user_id") or state.get("patient_id") or ""
    if not user_id:
        log.warning("dashboard_no_user")
        return {"dashboard_payload": {}, "view_role": "unknown"}

    log.info("dashboard_entering", user_id=user_id)

    try:
        role = determine_user_role(user_id)
        outputs = fetch_agent_outputs(state)

        if role == "dietitian":
            payload = build_dietitian_view(outputs, user_id)
        else:
            payload = build_patient_view(outputs, user_id)

        push_realtime_to_firebase(f"/dashboard/{user_id}/live", payload)
        cache_view_state(user_id, payload)

        log.info("dashboard_done", role=role, cards=len(payload.get("cards", [])))
        return {"dashboard_payload": payload, "view_role": role}

    except Exception as e:  # noqa: BLE001
        log.exception("dashboard_failure")
        return {
            "dashboard_payload": {"error": "dashboard_unavailable"},
            "view_role": "unknown",
            "errors": (state.get("errors") or []) + [{"agent": "dashboard", "error": str(e)}],
        }
