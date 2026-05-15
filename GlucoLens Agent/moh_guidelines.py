"""
MOH Malaysia dietary guidelines used by Agent 3 for recommendation context,
plus category-default Glycemic Index values used by Agent 2 as a fallback.
"""

MOH_GUIDELINES: dict[str, dict[str, str]] = {
    "carbs": {
        "source": "MOH Malaysia CPG Diabetes 2020",
        "recommendation": "≤45g carbohydrate per main meal for stable T2DM control.",
    },
    "gl": {
        "source": "MOH Malaysia CPG Diabetes 2020",
        "recommendation": "Meal Glycemic Load ≤15 for optimal post-prandial glucose control.",
    },
    "sodium": {
        "source": "MOH Malaysia Salt Reduction Strategy 2015",
        "recommendation": "Daily sodium ≤2000mg; per meal ≤600mg.",
    },
    "protein": {
        "source": "MyDRI 2017 (Malaysian Dietary Reference Intakes)",
        "recommendation": "Older T2DM adults: 1.0-1.2 g/kg/day protein intake.",
    },
    "fiber": {
        "source": "MyDRI 2017",
        "recommendation": "≥25g dietary fiber per day for adults.",
    },
}


GI_CATEGORY_DEFAULTS: dict[str, int] = {
    "rice_dish":      73,
    "noodle_dish":    65,
    "bread":          70,
    "protein_dish":   30,
    "soup":           20,
    "fried_snack":    65,
    "snack":          55,
    "kuih":           70,
    "drink_sweet":    55,
    "dessert":        65,
    "vegetable":      30,
    "fruit":          50,
    "unknown":        65,
}
