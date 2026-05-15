"""
Agent 2 — Nutritional Engine

Job: Map identified food items to nutritional values and aggregate to meal totals.

Inputs from state:
  - meal_items: list[dict]
  - patient_id (for allergen check)

Outputs to state:
  - nutrition_totals: dict
  - nutrition_per_item: list[dict]
  - data_source: str
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from backend.models.state import GlucoLensState
from backend.tools import openai_tools, firebase_tools
from backend.tools.moh_guidelines import GI_CATEGORY_DEFAULTS
from backend.tools.normalize import normalize_food_name
from backend.tools.prompts import ESTIMATE_NUTRIENTS_PROMPT
from backend.utils.cache import nutrient_estimate_cache
from backend.utils.logging import agent_logger

log = agent_logger("nutrition")


# === Load the hardcoded nutrition DB once ===

_DB_PATH = Path(__file__).resolve().parent.parent / "tools" / "nutrition_db.json"
with open(_DB_PATH, "r", encoding="utf-8") as f:
    _RAW_DB = json.load(f)

# DB schema: {"dishes": [{name, calories_per_100g, carbs_g, protein_g, fat_g, fibre_g, sodium_mg, gi}, ...]}
_DISHES: list[dict] = _RAW_DB.get("dishes", []) if isinstance(_RAW_DB, dict) else _RAW_DB


def _normalise_entry(entry: dict) -> dict:
    """Convert flat DB row → agent-expected schema."""
    return {
        "per_100g": {
            "calories_kcal": entry.get("calories_per_100g", 0),
            "carbs_g": entry.get("carbs_g", 0),
            "protein_g": entry.get("protein_g", 0),
            "fat_g": entry.get("fat_g", 0),
            "fiber_g": entry.get("fibre_g", entry.get("fiber_g", 0)),
            "sodium_mg": entry.get("sodium_mg", 0),
        },
        "glycemic_index": entry.get("gi", entry.get("glycemic_index", 65)),
        "category": entry.get("category", "malaysian_dish"),
        "name_display": entry.get("name", ""),
    }


# === Tools ===

def lookup_myfcd(food_name: str) -> Optional[dict]:
    """Look up nutrition for a food in the hardcoded MyFCD-style DB."""
    key = normalize_food_name(food_name)
    for entry in _DISHES:
        if normalize_food_name(entry.get("name", "")) == key:
            return _normalise_entry(entry)
    return None


def lookup_gi_index(food_name: str, category: str = "unknown") -> int:
    """Glycemic Index lookup. Falls back to category default."""
    entry = lookup_myfcd(food_name)
    if entry and "glycemic_index" in entry:
        return int(entry["glycemic_index"])
    return GI_CATEGORY_DEFAULTS.get(category, GI_CATEGORY_DEFAULTS["unknown"])


def calculate_glycemic_load(carbs_g: float, gi: int) -> float:
    """Standard GL formula: (GI × carbs) / 100."""
    return round((gi * max(0.0, carbs_g)) / 100.0, 1)


def estimate_missing_nutrients(food_name: str) -> dict:
    """LLM fallback for dishes not in the hardcoded DB."""
    key = normalize_food_name(food_name)
    cached = nutrient_estimate_cache.get(key)
    if cached:
        return cached

    fallback = {
        "calories_kcal": 200, "carbs_g": 25, "protein_g": 6,
        "fat_g": 7, "fiber_g": 1.0, "sodium_mg": 400,
        "glycemic_index": 65,
    }
    result = openai_tools.chat_json(
        system="You output strict JSON only.",
        user=ESTIMATE_NUTRIENTS_PROMPT.format(food_name=food_name),
        fallback=fallback,
    )
    if not isinstance(result, dict):
        result = fallback
    # Validate keys and types
    for key_name, default in fallback.items():
        if key_name not in result or not isinstance(result[key_name], (int, float)):
            result[key_name] = default

    nutrient_estimate_cache.set(key, result)
    return result


def check_allergens(food_item: dict, patient_profile: dict) -> list[str]:
    """Return list of triggered allergens for this item against the patient's allergen list."""
    allergens = [a.lower() for a in patient_profile.get("allergens", [])]
    if not allergens:
        return []
    components = [c.lower() for c in food_item.get("components", [])]
    components.append((food_item.get("name", "") or "").lower())
    triggered = []
    for a in allergens:
        if any(a in c for c in components):
            triggered.append(a)
    return triggered


def aggregate_meal_totals(items: list[dict]) -> dict:
    """Sum macros, sodium, and GL across all items in a meal."""
    totals = {
        "calories_kcal": 0.0, "carbs_g": 0.0, "protein_g": 0.0,
        "fat_g": 0.0, "fiber_g": 0.0, "sodium_mg": 0.0, "glycemic_load": 0.0,
    }
    for it in items:
        portion = float(it.get("portion_g", 0)) or 0.0
        ratio = portion / 100.0
        nut = it.get("nutrition_per_100g", {}) or {}
        totals["calories_kcal"] += float(nut.get("calories_kcal", 0)) * ratio
        totals["carbs_g"]       += float(nut.get("carbs_g", 0))       * ratio
        totals["protein_g"]     += float(nut.get("protein_g", 0))     * ratio
        totals["fat_g"]         += float(nut.get("fat_g", 0))         * ratio
        totals["fiber_g"]       += float(nut.get("fiber_g", 0))       * ratio
        totals["sodium_mg"]     += float(nut.get("sodium_mg", 0))     * ratio
        gi = int(it.get("gi") or it.get("glycemic_index") or 65)
        carbs_in_portion = float(nut.get("carbs_g", 0)) * ratio
        totals["glycemic_load"] += calculate_glycemic_load(carbs_in_portion, gi)
    return {k: round(v, 1) for k, v in totals.items()}


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    items = state.get("meal_items") or []
    if not items:
        return {
            "nutrition_totals": aggregate_meal_totals([]),
            "nutrition_per_item": [],
            "data_source": "empty",
        }

    log.info("nutrition_entering", n_items=len(items))

    try:
        profile = firebase_tools.fetch_patient_profile(state.get("patient_id", "")) or {}
        enriched: list[dict] = []
        sources: set[str] = set()

        for item in items:
            name = item.get("name", "")
            db_entry = lookup_myfcd(name)
            if db_entry:
                per_100g = db_entry["per_100g"]
                gi = int(db_entry.get("glycemic_index", 65))
                category = db_entry.get("category", "unknown")
                sources.add("myfcd")
            else:
                est = estimate_missing_nutrients(name)
                per_100g = {k: v for k, v in est.items() if k != "glycemic_index"}
                gi = int(est.get("glycemic_index", 65))
                category = item.get("category", "unknown")
                sources.add("estimate")

            portion = float(item.get("portion_g", item.get("portion_estimate_g", 100)))
            carbs_in_portion = float(per_100g.get("carbs_g", 0)) * portion / 100.0
            gl = calculate_glycemic_load(carbs_in_portion, gi)
            allergens = check_allergens(item, profile)

            enriched.append({
                **item,
                "portion_g": portion,
                "nutrition_per_100g": per_100g,
                "gi": gi,
                "gl": gl,
                "category": category,
                "allergens_triggered": allergens,
            })

        totals = aggregate_meal_totals(enriched)
        ds = "+".join(sorted(sources)) if sources else "unknown"

        log.info("nutrition_done", carbs=totals["carbs_g"], gl=totals["glycemic_load"], source=ds)
        return {
            "nutrition_totals": totals,
            "nutrition_per_item": enriched,
            "data_source": ds,
        }

    except Exception as e:  # noqa: BLE001
        log.exception("nutrition_failure")
        return {
            "nutrition_totals": aggregate_meal_totals([]),
            "nutrition_per_item": [],
            "data_source": "error",
            "errors": (state.get("errors") or []) + [{"agent": "nutrition", "error": str(e)}],
        }
