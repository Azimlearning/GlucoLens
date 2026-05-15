"""
Agent 3 — Clinical Personalization Agent

Job: Compare meal nutrition against the patient's clinical targets and produce
     traffic-light verdict, risk score, swap suggestions, drug-food interaction flags.

Inputs from state:
  - nutrition_totals
  - nutrition_per_item
  - meal_items
  - patient_id

Outputs to state:
  - traffic_light: dict
  - risk_score: int
  - recommendations: list[str]
  - drug_interactions: list[dict]
"""
from __future__ import annotations

from backend.models.state import GlucoLensState
from backend.tools import openai_tools, firebase_tools
from backend.tools.openai_tools import chat_json_array
from backend.tools.drug_food_interactions import lookup_med_interactions
from backend.tools.moh_guidelines import MOH_GUIDELINES
from backend.tools.normalize import normalize_food_name, pct_over, pct_under
from backend.tools.prompts import SWAP_SUGGESTION_PROMPT, GLUCOLENS_SYSTEM_IDENTITY
from backend.utils.cache import patient_profile_cache
from backend.utils.logging import agent_logger

log = agent_logger("clinical")


# === Constants ===

RISK_WEIGHTS = {"carbs": 0.30, "gl": 0.40, "sodium": 0.20, "protein": 0.10}


# === Tools ===

def fetch_patient_profile(patient_id: str) -> dict:
    """Cached patient profile fetch."""
    cached = patient_profile_cache.get(patient_id)
    if cached:
        return cached
    profile = firebase_tools.fetch_patient_profile(patient_id) or {}
    patient_profile_cache.set(patient_id, profile)
    return profile


def compare_against_targets(meal_totals: dict, targets: dict) -> dict:
    """Per-nutrient breach comparison."""
    return {
        "carbs": {
            "value":     float(meal_totals.get("carbs_g", 0)),
            "target":    float(targets.get("carbs_g_per_meal", 45)),
            "delta_pct": pct_over(meal_totals.get("carbs_g", 0),
                                  targets.get("carbs_g_per_meal", 45)),
        },
        "gl": {
            "value":     float(meal_totals.get("glycemic_load", 0)),
            "target":    float(targets.get("glycemic_load_per_meal", 15)),
            "delta_pct": pct_over(meal_totals.get("glycemic_load", 0),
                                  targets.get("glycemic_load_per_meal", 15)),
        },
        "sodium": {
            "value":     float(meal_totals.get("sodium_mg", 0)),
            "target":    float(targets.get("sodium_mg_per_meal", 600)),
            "delta_pct": pct_over(meal_totals.get("sodium_mg", 0),
                                  targets.get("sodium_mg_per_meal", 600)),
        },
        "protein": {
            "value":     float(meal_totals.get("protein_g", 0)),
            "target":    float(targets.get("protein_g_per_meal_min", 15)),
            # For protein, "delta_pct" measures shortfall (positive = under-target).
            "delta_pct": pct_under(meal_totals.get("protein_g", 0),
                                   targets.get("protein_g_per_meal_min", 15)),
        },
    }


def lookup_moh_diabetic_guidelines(nutrient: str) -> dict:
    return MOH_GUIDELINES.get(nutrient, {})


def check_drug_food_interactions(food_items: list[dict], medications: list[dict]) -> list[dict]:
    """Return any drug-food interactions triggered by this meal."""
    if not medications:
        return []
    triggered: list[dict] = []

    # Build a flat haystack of all food names + components in this meal.
    food_haystack: list[str] = []
    for item in food_items:
        food_haystack.append(normalize_food_name(item.get("name", "")))
        for comp in item.get("components", []):
            food_haystack.append(normalize_food_name(comp))

    for med in medications:
        med_name = med if isinstance(med, str) else med.get("name", "")
        interactions = lookup_med_interactions(med_name)
        for inter in interactions:
            target = normalize_food_name(inter["food"])
            if any(target in h or h in target for h in food_haystack if h):
                triggered.append({
                    "medication": med_name,
                    "food": inter["food"],
                    "severity": inter["severity"],
                    "note": inter["note"],
                })
    return triggered


def generate_traffic_light(comparison: dict) -> dict:
    """Green / yellow / red per nutrient.

    For 'carbs', 'gl', 'sodium': over-target => red (>20%), yellow (1-20%), green (<=0%).
    For 'protein': under-target => yellow (>0% under), green (at or above target).
    """
    out: dict[str, str] = {}
    for nutrient, data in comparison.items():
        d = data["delta_pct"]
        if nutrient == "protein":
            out[nutrient] = "green" if d <= 0 else "yellow"
        else:
            if d <= 0:
                out[nutrient] = "green"
            elif d <= 20:
                out[nutrient] = "yellow"
            else:
                out[nutrient] = "red"
    return out


_MEAL_TIMING_NOTES = {
    "breakfast": (
        "Breakfast sets blood sugar tone for the day. Heavy, high-GI foods (e.g. fried rice, roti canai with curry) "
        "are inappropriate; prefer oats, wholemeal bread, eggs, or light congee."
    ),
    "lunch": (
        "Lunch is the main meal of the day. Moderate portions with balanced macros are ideal. "
        "Avoid double carb stacking (e.g. rice AND noodles)."
    ),
    "dinner": (
        "Dinner should be lighter than lunch. Heavy carbs late in the day worsen overnight glucose. "
        "Prioritise protein and vegetables over high-carb staples."
    ),
    "snack": (
        "Snacks should be small (150–250 kcal), low-GI, and not replace a full meal. "
        "A heavy meal flagged as 'snack' (>400 kcal, >40g carbs) indicates a portion problem. "
        "Chips, crackers, or sugary drinks are not appropriate T2D snacks."
    ),
    "unspecified": "Meal occasion not specified.",
}


def generate_swap_suggestions(meal_items: list[dict], breaches: dict, profile: dict,
                               meal_type: str = "unspecified") -> list[str]:
    """LLM-driven culturally relevant swap suggestions, informed by meal timing."""
    if not breaches:
        return []

    meal_summary = ", ".join(it.get("name", "?") for it in meal_items if it.get("name"))
    breaches_summary = "\n".join(
        f"- {k.upper()}: {v['value']} (target {v['target']}, "
        f"{'over' if v['delta_pct'] > 0 else 'under'} by {abs(v['delta_pct'])}%)"
        for k, v in breaches.items()
    )
    meds = ", ".join(
        m if isinstance(m, str) else f"{m.get('name', '?')} {m.get('dose', '')}".strip()
        for m in profile.get("medications", [])
    ) or "None"

    timing_note = _MEAL_TIMING_NOTES.get(meal_type, _MEAL_TIMING_NOTES["unspecified"])

    prompt = SWAP_SUGGESTION_PROMPT.format(
        meal_summary=meal_summary or "(no items identified)",
        meal_type=meal_type,
        meal_timing_note=timing_note,
        breaches=breaches_summary,
        age=profile.get("age", "?"),
        sex=profile.get("sex", "?"),
        diagnosed=profile.get("diagnosed", "?"),
        hba1c=profile.get("hba1c", "?"),
        medications=meds,
        language=profile.get("language_preference", "en"),
    )

    meal_name = meal_items[0].get("name", "this meal") if meal_items else "this meal"
    fallback = [
        f"Consider reducing your portion of {meal_name}.",
        "You may want to pair this with a fiber-rich side like ulam or sayur kangkung.",
    ]
    system = (
        GLUCOLENS_SYSTEM_IDENTITY
        + "\n\nYou output a strict JSON array of strings only. "
        "No markdown, no prose, no wrapping object — just the array."
    )
    result = chat_json_array(
        system=system,
        user=prompt,
        fallback=None,
    )
    if isinstance(result, list) and all(isinstance(x, str) for x in result):
        return result[:4]
    if isinstance(result, dict) and "suggestions" in result:
        # Some LLMs wrap arrays in an object.
        s = result.get("suggestions")
        if isinstance(s, list):
            return [x for x in s if isinstance(x, str)][:4]
    return fallback


def calculate_meal_risk_score(comparison: dict) -> int:
    """Weighted composite 0-100. Higher = worse."""
    score = 0.0
    for nutrient, data in comparison.items():
        if nutrient == "protein":
            # under-target shortfall (positive delta_pct) contributes
            score += RISK_WEIGHTS[nutrient] * max(0.0, data["delta_pct"])
        else:
            score += RISK_WEIGHTS[nutrient] * max(0.0, data["delta_pct"])
    return min(100, int(score))


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    if state.get("event_type") != "meal_upload":
        return {}

    log.info("clinical_entering", session_id=state.get("session_id"))

    try:
        profile = fetch_patient_profile(state.get("patient_id", ""))
        if not profile:
            log.warning("clinical_no_profile", patient_id=state.get("patient_id"))
            return {
                "traffic_light": {}, "risk_score": 0,
                "recommendations": [], "drug_interactions": [],
            }

        targets = profile.get("targets", {})
        comparison = compare_against_targets(state.get("nutrition_totals", {}), targets)
        tl = generate_traffic_light(comparison)
        risk = calculate_meal_risk_score(comparison)
        interactions = check_drug_food_interactions(
            state.get("meal_items", []),
            profile.get("medications", []),
        )

        # Only generate swaps if there's something to swap for
        flagged = {k: v for k, v in comparison.items() if tl.get(k) in ("yellow", "red")}
        meal_type = state.get("meal_type") or "unspecified"
        recommendations = (
            generate_swap_suggestions(state.get("meal_items", []), flagged, profile, meal_type)
            if flagged else []
        )

        log.info("clinical_done", risk=risk, breaches=list(flagged.keys()),
                 interactions=len(interactions))
        return {
            "traffic_light": tl,
            "risk_score": risk,
            "recommendations": recommendations,
            "drug_interactions": interactions,
        }

    except Exception as e:  # noqa: BLE001
        log.exception("clinical_failure")
        return {
            "traffic_light": {}, "risk_score": 0,
            "recommendations": [], "drug_interactions": [],
            "errors": (state.get("errors") or []) + [{"agent": "clinical", "error": str(e)}],
        }
