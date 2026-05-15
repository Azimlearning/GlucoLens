"""
Drug-food interaction matrix. Used by Agents 3 (Clinical) and 8 (Misinfo).

Severity: "minor" | "moderate" | "high"
Detection: substring match of `food` against the normalized food name OR claim entity.
"""

DRUG_FOOD_INTERACTIONS: dict[str, list[dict]] = {
    "metformin": [
        {"food": "alcohol", "severity": "moderate",
         "note": "Increased risk of lactic acidosis when combined with alcohol."},
        {"food": "grapefruit", "severity": "minor",
         "note": "May modestly alter metformin levels."},
    ],
    "gliclazide": [
        {"food": "bitter_gourd", "severity": "moderate",
         "note": "Additive hypoglycemic effect; risk of dangerously low blood sugar."},
        {"food": "bitter_melon", "severity": "moderate",
         "note": "Same as bitter gourd — additive hypoglycemic effect."},
        {"food": "fenugreek", "severity": "moderate",
         "note": "Additive hypoglycemic effect."},
        {"food": "cinnamon_supplement", "severity": "minor",
         "note": "May add to glucose-lowering effect at high doses."},
        {"food": "alcohol", "severity": "moderate",
         "note": "Increased risk of hypoglycemia and disulfiram-like reaction."},
    ],
    "gliclazide_mr": [
        {"food": "bitter_gourd", "severity": "moderate",
         "note": "Additive hypoglycemic effect."},
        {"food": "alcohol", "severity": "moderate",
         "note": "Increased risk of hypoglycemia."},
    ],
    "glibenclamide": [
        {"food": "bitter_gourd", "severity": "moderate", "note": "Additive hypoglycemic effect."},
        {"food": "alcohol", "severity": "moderate", "note": "Risk of hypoglycemia."},
    ],
    "warfarin": [
        {"food": "leafy_greens", "severity": "moderate",
         "note": "High Vitamin K intake may antagonize warfarin's effect."},
        {"food": "kale", "severity": "moderate", "note": "Antagonizes warfarin."},
        {"food": "spinach", "severity": "moderate", "note": "Antagonizes warfarin."},
        {"food": "cranberry", "severity": "moderate", "note": "May increase bleeding risk."},
    ],
    "statin": [
        {"food": "grapefruit", "severity": "high",
         "note": "Inhibits CYP3A4; can raise statin levels and cause muscle damage."},
        {"food": "grapefruit_juice", "severity": "high", "note": "Same as grapefruit."},
    ],
    "simvastatin": [
        {"food": "grapefruit", "severity": "high", "note": "Significantly increases statin levels."},
    ],
    "atorvastatin": [
        {"food": "grapefruit", "severity": "moderate", "note": "May increase statin levels."},
    ],
    "amlodipine": [
        {"food": "grapefruit", "severity": "moderate", "note": "May increase amlodipine levels."},
    ],
    "insulin": [
        {"food": "alcohol", "severity": "high",
         "note": "Severe hypoglycemia risk, especially overnight."},
        {"food": "bitter_gourd", "severity": "moderate",
         "note": "Additive hypoglycemic effect."},
    ],
}


def lookup_med_interactions(med_name: str) -> list[dict]:
    """Look up interactions for a medication name (case-insensitive, normalised)."""
    key = med_name.lower().strip().replace(" ", "_")
    # Try direct match
    if key in DRUG_FOOD_INTERACTIONS:
        return DRUG_FOOD_INTERACTIONS[key]
    # Try stripping dose/frequency suffixes (e.g. "metformin_1000mg_bd" -> "metformin")
    base = key.split("_")[0]
    return DRUG_FOOD_INTERACTIONS.get(base, [])
