# MOH Malaysia Clinical Practice Guidelines for Type 2 Diabetes (2020 edition)
# Reference: CPG Management of Type 2 Diabetes Mellitus (6th Ed, 2020)

MOH_GUIDELINES: dict = {
    "daily_targets": {
        "calories_kcal": {"min": 1500, "max": 2000, "note": "Adjust for BMI and activity"},
        "carbs_percent": {"min": 45, "max": 60, "note": "% of total energy"},
        "carbs_g_per_meal": {"max": 60, "note": "Per main meal"},
        "protein_percent": {"min": 15, "max": 20},
        "fat_percent": {"max": 35},
        "saturated_fat_percent": {"max": 7},
        "fibre_g": {"min": 20, "max": 30},
        "sodium_mg": {"max": 2000},
    },
    "glycemic_targets": {
        "fasting_mmol": {"target": 4.4, "max": 7.0},
        "post_meal_2h_mmol": {"target": 7.8, "max": 10.0},
        "hba1c_percent": {"target": 6.5, "max": 8.0},
    },
    "traffic_light_thresholds": {
        "meal_gl": {
            "green": {"max": 10},
            "amber": {"min": 10, "max": 20},
            "red": {"min": 20},
        },
        "meal_carbs_g": {
            "green": {"max": 45},
            "amber": {"min": 45, "max": 60},
            "red": {"min": 60},
        },
        "meal_calories_kcal": {
            "green": {"max": 500},
            "amber": {"min": 500, "max": 700},
            "red": {"min": 700},
        },
    },
    "alert_thresholds": {
        "glucose_hypo_mmol": 4.0,
        "glucose_hyper_mmol": 10.0,
        "glucose_critical_high_mmol": 14.0,
        "meal_risk_score_alert": 7.0,
    },
    "recommended_foods": [
        "Brown rice", "Oats", "Whole grain bread", "Vegetables", "Legumes",
        "Fish", "Chicken (skinless)", "Low-fat dairy", "Fruits (low GI)",
    ],
    "foods_to_limit": [
        "White rice (large portions)", "Sugary drinks", "Fried foods",
        "Processed meats", "High-fat coconut milk dishes", "Pastries",
    ],
}
