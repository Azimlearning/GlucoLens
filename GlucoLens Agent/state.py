"""
GlucoLensState — the canonical state object that flows through every LangGraph pipeline.

Every agent reads its inputs from this state and returns a partial dict update.
LangGraph merges the partials into the running state.

Agents NEVER call each other directly. They communicate exclusively via state.
"""
from typing import TypedDict, Optional


class GlucoLensState(TypedDict, total=False):
    # === Event context ===
    event_type: str          # "meal_upload" | "glucose_entry" | "misinformation_query" | "weekly_report" | "dashboard_load"
    patient_id: str
    user_id: str             # for dashboard_load; may differ from patient_id (dietitian case)
    dietitian_id: Optional[str]
    session_id: str
    timestamp: str           # ISO8601 UTC

    # === Event-specific inputs ===
    image_base64: Optional[str]
    image_url: Optional[str]
    glucose_value: Optional[float]
    glucose_context: Optional[str]   # "pre_meal" | "post_meal" | "fasting" | "random"
    raw_query: Optional[str]

    # === Agent 1 (Vision) outputs ===
    meal_items: list[dict]
    unrecognized_items: list[dict]
    recognition_method: str

    # === Agent 2 (Nutrition) outputs ===
    nutrition_totals: dict
    nutrition_per_item: list[dict]
    data_source: str

    # === Agent 3 (Clinical) outputs ===
    traffic_light: dict
    risk_score: int
    recommendations: list[str]
    drug_interactions: list[dict]

    # === Agent 4 (Glucose) outputs ===
    glucose_insights: list[dict]

    # === Agent 5 (Alert) outputs ===
    alerts: list[dict]

    # === Agent 6 (Report) outputs ===
    pdf_url: str

    # === Agent 7 (Dashboard) outputs ===
    dashboard_payload: dict
    view_role: str

    # === Agent 8 (Misinfo) outputs ===
    verdict: str
    verdict_explanation: str
    disclaimer: str
    logged_for_dietitian: bool
    evidence_sources: list[dict]

    # === Metadata ===
    errors: list[dict]
    cached: bool


EMPTY_STATE: GlucoLensState = {
    "event_type": "",
    "patient_id": "",
    "user_id": "",
    "dietitian_id": None,
    "session_id": "",
    "timestamp": "",
    "image_base64": None,
    "image_url": None,
    "glucose_value": None,
    "glucose_context": None,
    "raw_query": None,
    "meal_items": [],
    "unrecognized_items": [],
    "recognition_method": "",
    "nutrition_totals": {},
    "nutrition_per_item": [],
    "data_source": "",
    "traffic_light": {},
    "risk_score": 0,
    "recommendations": [],
    "drug_interactions": [],
    "glucose_insights": [],
    "alerts": [],
    "pdf_url": "",
    "dashboard_payload": {},
    "view_role": "",
    "verdict": "",
    "verdict_explanation": "",
    "disclaimer": "",
    "logged_for_dietitian": False,
    "evidence_sources": [],
    "errors": [],
    "cached": False,
}


# Allowed event types — used by orchestrator for validation.
EVENT_TYPES = (
    "meal_upload",
    "glucose_entry",
    "misinformation_query",
    "weekly_report",
    "dashboard_load",
)

# Required payload keys per event — used by orchestrator.classify_event.
EVENT_REQUIREMENTS: dict[str, list[str]] = {
    "meal_upload":          ["patient_id", "image_base64"],
    "glucose_entry":        ["patient_id", "glucose_value"],
    "misinformation_query": ["patient_id", "raw_query"],
    "weekly_report":        ["patient_id"],
    "dashboard_load":       ["user_id"],
}
