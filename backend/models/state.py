from typing import TypedDict, Optional, Any


class GlucoLensState(TypedDict, total=False):
    # Session
    session_id: str
    event_type: str  # meal_upload | glucose_entry | misinformation_query | weekly_report | dashboard_load
    user_id: str
    user_role: str   # patient | dietitian

    # Agent 1 — Vision
    image_base64: str
    recognized_items: list[dict]       # [{name, portion_g, confidence}]
    unrecognized_flags: list[str]

    # Agent 2 — Nutrition
    nutrition_breakdown: list[dict]    # [{name, calories, carbs_g, protein_g, fat_g, gi, gl}]
    meal_totals: dict                  # {calories, carbs_g, protein_g, fat_g, total_gl}
    allergen_flags: list[str]

    # Agent 3 — Clinical
    patient_profile: dict
    traffic_light: str                 # green | amber | red
    swap_suggestions: list[dict]       # [{original, swap, reason}]
    meal_risk_score: float
    drug_interaction_flags: list[str]
    clinical_notes: str

    # Agent 4 — Glucose
    glucose_readings: list[dict]       # [{timestamp, value_mmol, meal_id}]
    glucose_insight: dict              # {trend, trigger_foods, vs_population}

    # Agent 5 — Alert
    alerts: list[dict]                 # [{type, severity, message, timestamp}]
    alert_ids: list[str]

    # Agent 6 — Report
    report_url: str
    week_summary: dict

    # Agent 7 — Dashboard
    patient_view: dict
    dietitian_view: dict
    realtime_pushed: bool

    # Agent 8 — Misinfo
    claim_text: str
    verdict: str                       # safe | caution | harmful_for_you | insufficient_evidence
    evidence_summary: str
    misinfo_sources: list[str]

    # Cross-agent
    meal_id: str
    errors: list[dict]                 # [{agent, error}]


EMPTY_STATE: GlucoLensState = {
    "session_id": "",
    "event_type": "",
    "user_id": "",
    "user_role": "",
    "image_base64": "",
    "recognized_items": [],
    "unrecognized_flags": [],
    "nutrition_breakdown": [],
    "meal_totals": {},
    "allergen_flags": [],
    "patient_profile": {},
    "traffic_light": "",
    "swap_suggestions": [],
    "meal_risk_score": 0.0,
    "drug_interaction_flags": [],
    "clinical_notes": "",
    "glucose_readings": [],
    "glucose_insight": {},
    "alerts": [],
    "alert_ids": [],
    "report_url": "",
    "week_summary": {},
    "patient_view": {},
    "dietitian_view": {},
    "realtime_pushed": False,
    "claim_text": "",
    "verdict": "",
    "evidence_summary": "",
    "misinfo_sources": [],
    "meal_id": "",
    "errors": [],
}
