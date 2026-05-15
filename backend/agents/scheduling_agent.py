"""
Agent 10 — Clinical Meeting Scheduler

Job: Generate a structured dietitian-patient meeting agenda based on the patient's
     recent nutrition data, glucose readings, and clinical profile.

Follows: Malaysian Dietary Guidelines 2020, MOH CPG for T2DM, PDM guidelines.

Inputs: patient_id (supplied directly, not via pipeline state)
Outputs: meeting_plan dict
"""
from __future__ import annotations

from datetime import datetime, timezone

from backend.tools import firebase_tools, openai_tools
from backend.tools.prompts import MEETING_AGENDA_PROMPT
from backend.utils.logging import agent_logger

log = agent_logger("scheduling")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def fetch_recent_meals(patient_id: str, limit: int = 10) -> list[dict]:
    try:
        db = firebase_tools.firestore_client()
        snap = (
            db.collection("patients").document(patient_id)
            .collection("meals")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [d.to_dict() for d in snap]
    except Exception as e:
        log.warning("scheduling_meals_fetch_failed", error=str(e))
        return []


def fetch_recent_glucose(patient_id: str, limit: int = 14) -> list[dict]:
    try:
        db = firebase_tools.firestore_client()
        snap = (
            db.collection("patients").document(patient_id)
            .collection("glucose")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [d.to_dict() for d in snap]
    except Exception as e:
        log.warning("scheduling_glucose_fetch_failed", error=str(e))
        return []


def fetch_recent_alerts(patient_id: str, limit: int = 10) -> list[dict]:
    try:
        db = firebase_tools.firestore_client()
        snap = (
            db.collection("patients").document(patient_id)
            .collection("alerts")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [d.to_dict() for d in snap]
    except Exception as e:
        log.warning("scheduling_alerts_fetch_failed", error=str(e))
        return []


def _summarise_meals(meals: list[dict]) -> str:
    if not meals:
        return "No meals logged in recent period."
    risk_scores = [m.get("risk_score", m.get("meal_risk_score", 0)) for m in meals]
    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
    avg_cal = round(
        sum(m.get("calories", m.get("nutrition_totals", {}).get("calories_kcal", 0)) for m in meals) / len(meals)
    )
    avg_carbs = round(
        sum(m.get("carbs_g", m.get("nutrition_totals", {}).get("carbs_g", 0)) for m in meals) / len(meals)
    )
    high_risk = sum(1 for s in risk_scores if s >= 70)
    return (
        f"{len(meals)} meals logged. Avg risk score: {avg_risk}/100. "
        f"High-risk meals: {high_risk}. Avg calories: {avg_cal} kcal/meal. "
        f"Avg carbs: {avg_carbs}g/meal."
    )


def _summarise_glucose(readings: list[dict]) -> str:
    if not readings:
        return "No glucose readings available."
    values = [r.get("value_mmol", 0) for r in readings if r.get("value_mmol")]
    if not values:
        return "Glucose readings present but no values."
    avg = round(sum(values) / len(values), 1)
    low = round(min(values), 1)
    high = round(max(values), 1)
    hypos = sum(1 for v in values if v < 3.9)
    hypers = sum(1 for v in values if v > 11.0)
    return (
        f"{len(values)} readings. Avg: {avg} mmol/L (range {low}–{high}). "
        f"Hypoglycaemia events (<3.9): {hypos}. Hyperglycaemia events (>11.0): {hypers}."
    )


def _summarise_alerts(alerts: list[dict]) -> str:
    if not alerts:
        return "No recent alerts."
    critical = [a for a in alerts if a.get("severity") == "critical"]
    moderate = [a for a in alerts if a.get("severity") == "moderate"]
    return (
        f"{len(alerts)} alerts total. Critical: {len(critical)}. "
        f"Moderate: {len(moderate)}. "
        f"Types: {', '.join(set(a.get('breach_type', '?') for a in alerts[:5]))}."
    )


def _build_patient_summary(profile: dict, user: dict) -> str:
    name = user.get("displayName", user.get("name", "Patient"))
    age = profile.get("age", "?")
    gender = profile.get("gender", "?")
    bmi = profile.get("bmi", "?")
    hba1c = profile.get("hba1c_percent", profile.get("hba1c", "?"))
    meds = profile.get("medications", [])
    med_str = ", ".join(m if isinstance(m, str) else m.get("name", "?") for m in meds) or "None"
    cal_target = profile.get("daily_calorie_target", 1800)
    carb_target = profile.get("daily_carb_target_g", 130)
    return (
        f"Name: {name}, Age: {age}, Gender: {gender}, BMI: {bmi}, "
        f"HbA1c: {hba1c}%, Medications: {med_str}. "
        f"Targets: {cal_target} kcal/day, {carb_target}g carbs/day."
    )


def generate_meeting_plan(patient_id: str) -> dict:
    """Generate a clinical meeting agenda for a patient. Main public function."""
    log.info("scheduling_entering", patient_id=patient_id)

    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    user = firebase_tools.fetch_user(patient_id) or {}
    meals = fetch_recent_meals(patient_id)
    glucose = fetch_recent_glucose(patient_id)
    alerts = fetch_recent_alerts(patient_id)

    patient_summary = _build_patient_summary(profile, user)
    nutrition_summary = _summarise_meals(meals)
    glucose_summary = _summarise_glucose(glucose)
    alerts_summary = _summarise_alerts(alerts)

    fallback_plan = {
        "meeting_date_suggestion": "within 2 weeks",
        "priority": "routine",
        "duration_min": 30,
        "agenda_items": [
            {
                "order": 1,
                "topic": "Review HbA1c and glucose control",
                "duration_min": 10,
                "talking_points": ["Review latest HbA1c trend", "Discuss glucose variability"],
                "clinical_basis": "MOH CPG T2DM 2020",
            },
            {
                "order": 2,
                "topic": "Dietary intake review",
                "duration_min": 10,
                "talking_points": ["Review 7-day food log", "Assess carb distribution"],
                "clinical_basis": "Malaysian Dietary Guidelines 2020",
            },
            {
                "order": 3,
                "topic": "Medication and lifestyle update",
                "duration_min": 10,
                "talking_points": ["Medication adherence check", "Physical activity level"],
                "clinical_basis": "PDM guideline",
            },
        ],
        "key_concerns": ["Insufficient data — encourage meal logging"],
        "dietary_targets_to_review": [],
        "recommended_actions": ["Encourage daily meal logging", "Schedule follow-up glucose monitoring"],
        "follow_up_interval_weeks": 4,
    }

    prompt = MEETING_AGENDA_PROMPT.format(
        patient_summary=patient_summary,
        nutrition_summary=nutrition_summary,
        glucose_summary=glucose_summary,
        alerts_summary=alerts_summary,
    )

    result = openai_tools.chat_json(
        system="You output strict JSON only.",
        user=prompt,
        fallback=fallback_plan,
    )

    if not isinstance(result, dict):
        result = fallback_plan

    result["patient_id"] = patient_id
    result["generated_at"] = _now_iso()
    result["patient_name"] = user.get("displayName", user.get("name", ""))

    log.info("scheduling_done", patient_id=patient_id, priority=result.get("priority"))
    return result
