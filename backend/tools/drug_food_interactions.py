# Drug-food interaction matrix for common T2DM medications in Malaysia.
# Keys are medication names (lowercase). Values list foods to avoid and the risk.

DRUG_FOOD_INTERACTIONS: dict[str, list[dict]] = {
    "metformin": [
        {"food": "alcohol", "risk": "lactic acidosis risk", "severity": "high"},
        {"food": "high-fat meal", "risk": "delayed absorption", "severity": "low"},
    ],
    "glipizide": [
        {"food": "alcohol", "risk": "severe hypoglycemia", "severity": "high"},
        {"food": "grapefruit", "risk": "increased drug level", "severity": "medium"},
    ],
    "glibenclamide": [
        {"food": "alcohol", "risk": "severe hypoglycemia", "severity": "high"},
    ],
    "sitagliptin": [
        {"food": "alcohol", "risk": "hypoglycemia risk", "severity": "medium"},
    ],
    "empagliflozin": [
        {"food": "alcohol", "risk": "dehydration and DKA risk", "severity": "high"},
        {"food": "high-sugar drink", "risk": "reduced drug efficacy", "severity": "medium"},
    ],
    "dapagliflozin": [
        {"food": "alcohol", "risk": "dehydration and DKA risk", "severity": "high"},
    ],
    "insulin": [
        {"food": "alcohol", "risk": "severe hypoglycemia", "severity": "high"},
        {"food": "high-carb meal without dose adjustment", "risk": "hyperglycemia", "severity": "medium"},
    ],
    "warfarin": [
        {"food": "vitamin k rich foods", "risk": "reduced anticoagulation", "severity": "high"},
        {"food": "grapefruit", "risk": "increased bleeding risk", "severity": "high"},
        {"food": "alcohol", "risk": "increased bleeding risk", "severity": "high"},
    ],
    "atorvastatin": [
        {"food": "grapefruit", "risk": "increased statin level, myopathy risk", "severity": "high"},
        {"food": "alcohol", "risk": "liver toxicity risk", "severity": "medium"},
    ],
    "simvastatin": [
        {"food": "grapefruit", "risk": "increased statin level, myopathy risk", "severity": "high"},
        {"food": "alcohol", "risk": "liver toxicity risk", "severity": "medium"},
    ],
}

# Food keywords to check against (maps ingredient keywords to interaction triggers)
FOOD_TRIGGER_KEYWORDS: dict[str, list[str]] = {
    "alcohol": ["beer", "wine", "spirits", "alcohol", "toddy", "tuak"],
    "grapefruit": ["grapefruit", "pomelo"],
    "high-fat meal": ["fried", "lemak", "rendang", "goreng"],
    "vitamin k rich foods": ["spinach", "bayam", "kale", "broccoli", "kangkung"],
    "high-sugar drink": ["teh tarik", "milo", "sirap", "bandung", "sugarcane"],
    "high-carb meal without dose adjustment": ["nasi", "rice", "bread", "roti", "mee", "pasta"],
}
