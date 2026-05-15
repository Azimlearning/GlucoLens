"""
Agent 5 — Alert Manager

Job: Monitor meal/glucose events and push alerts to the dashboard feed when clinical
     thresholds are breached.

Output channels (this build): Firebase Realtime DB push to /dashboard/{uid}/alerts.
Stubs prepared for: Telegram, email, WebSocket.

Inputs from state:
  - nutrition_totals
  - traffic_light, risk_score
  - patient_id

Outputs to state:
  - alerts: list[dict]
"""
from __future__ import annotations

from uuid import uuid4

from backend.config import settings
from backend.models.state import GlucoLensState
from backend.tools import firebase_tools
from backend.tools.normalize import now_iso
from backend.utils.cache import patient_profile_cache
from backend.utils.logging import agent_logger

log = agent_logger("alert")


# === Threshold rules ===

SEVERITY_RULES = [
    {"key": "carbs_g",       "target_key": "carbs_g_per_meal",       "tolerance_pct": 0,  "severity": "moderate"},
    {"key": "glycemic_load", "target_key": "glycemic_load_per_meal", "tolerance_pct": 33, "severity": "critical"},
    {"key": "sodium_mg",     "target_key": "sodium_mg_per_meal",     "tolerance_pct": 17, "severity": "moderate"},
]

GLUCOSE_THRESHOLDS = {
    "hypo_mmol":         3.9,
    "hyperglycemia_mmol":11.0,
}


# === Tools ===

def check_threshold_breach(meal_totals: dict, patient_targets: dict) -> list[dict]:
    """Return list of breach descriptors for a meal."""
    breaches: list[dict] = []
    for rule in SEVERITY_RULES:
        actual = float(meal_totals.get(rule["key"], 0) or 0)
        target = float(patient_targets.get(rule["target_key"], 0) or 0)
        if target <= 0:
            continue
        threshold = target * (1 + rule["tolerance_pct"] / 100.0)
        if actual > threshold:
            breaches.append({
                "nutrient":  rule["key"],
                "actual":    round(actual, 1),
                "target":    target,
                "delta_pct": round(((actual - target) / target) * 100, 1),
                "severity":  rule["severity"],
            })
    return breaches


def check_glucose_breach(glucose_value: float, context: str = "random") -> list[dict]:
    """Return alert dict for hypoglycemia/hyperglycemia if value crosses threshold."""
    if glucose_value is None:
        return []
    breaches = []
    if glucose_value < GLUCOSE_THRESHOLDS["hypo_mmol"]:
        breaches.append({
            "nutrient": "glucose_hypo",
            "actual":   glucose_value,
            "target":   GLUCOSE_THRESHOLDS["hypo_mmol"],
            "delta_pct": 0,
            "severity": "critical",
            "context":  context,
        })
    elif glucose_value > GLUCOSE_THRESHOLDS["hyperglycemia_mmol"]:
        breaches.append({
            "nutrient": "glucose_hyper",
            "actual":   glucose_value,
            "target":   GLUCOSE_THRESHOLDS["hyperglycemia_mmol"],
            "delta_pct": round(
                ((glucose_value - GLUCOSE_THRESHOLDS["hyperglycemia_mmol"])
                 / GLUCOSE_THRESHOLDS["hyperglycemia_mmol"]) * 100, 1),
            "severity": "moderate",
            "context":  context,
        })
    return breaches


def calculate_breach_severity(breach: dict) -> str:
    """Upgrade severity if the delta is extreme."""
    d = breach.get("delta_pct", 0)
    if breach.get("severity") == "critical":
        return "critical"
    if d > 100:
        return "critical"
    if d > 50:
        return "moderate"
    return breach.get("severity", "minor")


def create_alert_payload(breach: dict, patient: dict, dietitian_id: str | None,
                         meal_id: str | None = None) -> dict:
    """Build a structured alert object."""
    severity = calculate_breach_severity(breach)
    return {
        "alert_id":      str(uuid4()),
        "timestamp":     now_iso(),
        "patient_id":    patient.get("uid", ""),
        "patient_name":  patient.get("displayName", ""),
        "dietitian_id":  dietitian_id or "",
        "breach_type":   breach["nutrient"],
        "severity":      severity,
        "message":       (
            f"{breach['nutrient'].replace('_', ' ').title()} "
            f"exceeded target by {breach['delta_pct']}%"
            if breach.get("delta_pct") else
            f"{breach['nutrient'].replace('_', ' ').title()} "
            f"reading {breach['actual']} crossed threshold {breach['target']}"
        ),
        "actual":        breach["actual"],
        "target":        breach["target"],
        "meal_id":       meal_id or "",
        "seen":          False,
    }


def push_to_dashboard_feed(alert: dict) -> None:
    """Push the alert to both patient and dietitian RTDB channels."""
    pid = alert["patient_id"]
    did = alert.get("dietitian_id")
    firebase_tools.push_realtime_child(f"/dashboard/{pid}/alerts", alert["alert_id"], alert)
    if did:
        firebase_tools.push_realtime_child(f"/dashboard/{did}/alerts", alert["alert_id"], alert)


def send_telegram_alert(alert: dict) -> None:
    """Stub. Active when TELEGRAM_ENABLED=true."""
    if not settings.TELEGRAM_ENABLED:
        log.debug("telegram_stub_skipped", alert_id=alert["alert_id"])
        return
    # Production: telegram_client.send_message(...)


def send_email_alert(alert: dict) -> None:
    """Stub. Active when EMAIL_ENABLED=true."""
    if not settings.EMAIL_ENABLED:
        log.debug("email_stub_skipped", alert_id=alert["alert_id"])
        return
    # Production: smtp_client.send(...)


def log_alert_history(patient_id: str, alert: dict) -> None:
    """Persist alert to Firestore."""
    firebase_tools.write_patient_alert(patient_id, alert["alert_id"], alert)


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    event = state.get("event_type")
    if event not in ("meal_upload", "glucose_entry"):
        return {"alerts": []}

    patient_id = state.get("patient_id", "")
    if not patient_id:
        return {"alerts": []}

    log.info("alert_entering", event=event)

    try:
        profile = patient_profile_cache.get(patient_id) or \
                  firebase_tools.fetch_patient_profile(patient_id) or {}
        if profile:
            patient_profile_cache.set(patient_id, profile)
        user = firebase_tools.fetch_user(patient_id) or {"uid": patient_id, "displayName": ""}
        user["uid"] = patient_id
        dietitian_id = profile.get("assigned_dietitian")

        breaches: list[dict] = []
        if event == "meal_upload":
            breaches = check_threshold_breach(
                state.get("nutrition_totals", {}),
                profile.get("targets", {}),
            )
        elif event == "glucose_entry":
            breaches = check_glucose_breach(
                state.get("glucose_value"),
                state.get("glucose_context", "random") or "random",
            )

        # Synthesize a meal_id (best-effort) for trace linking
        meal_id = state.get("session_id", "")[:12] if event == "meal_upload" else ""

        alerts: list[dict] = []
        for b in breaches:
            payload = create_alert_payload(b, user, dietitian_id, meal_id=meal_id)
            push_to_dashboard_feed(payload)
            log_alert_history(patient_id, payload)
            send_telegram_alert(payload)
            send_email_alert(payload)
            alerts.append(payload)

        log.info("alert_done", n_alerts=len(alerts))
        return {"alerts": alerts}

    except Exception as e:  # noqa: BLE001
        log.exception("alert_failure")
        return {
            "alerts": [],
            "errors": (state.get("errors") or []) + [{"agent": "alert", "error": str(e)}],
        }
