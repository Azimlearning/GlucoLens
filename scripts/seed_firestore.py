"""Seed Firestore with demo users, Rahman's profile, 7 days of meals, 14 days of glucose.
Also seeds Mei Ling as a second demo patient.
"""
import sys
import os
sys.stdout.reconfigure(encoding="utf-8")  # support checkmark chars on Windows
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa: F401 — triggers .env load
from backend.tools.firebase_tools import firestore_set, firestore_client, _init_app
from firebase_admin import auth

NOW = datetime.now(timezone.utc)


def _get_or_create_auth_user(uid: str, email: str, password: str, display_name: str) -> str:
    """Create Firebase Auth user if it doesn't exist. Returns uid."""
    _init_app()
    try:
        user = auth.get_user_by_email(email)
        print(f"  Auth user exists: {email}")
        return user.uid
    except auth.UserNotFoundError:
        user = auth.create_user(
            uid=uid,
            email=email,
            password=password,
            display_name=display_name,
            email_verified=True,
        )
        print(f"  Auth user created: {email}")
        return user.uid


def seed_users():
    _get_or_create_auth_user("uid_rahman", "rahman@demo.com", "demo123", "Rahman bin Abdullah")
    _get_or_create_auth_user("uid_aisyah", "aisyah@demo.com", "demo123", "Dr. Aisyah Mohd Noor")
    _get_or_create_auth_user("uid_meiling", "meiling@demo.com", "demo123", "Mei Ling Tan")

    firestore_set("users", "uid_rahman", {
        "uid": "uid_rahman",
        "email": "rahman@demo.com",
        "name": "Rahman bin Abdullah",
        "role": "patient",
        "dietitian_id": "uid_aisyah",
        "created_at": NOW.isoformat(),
    })
    firestore_set("users", "uid_aisyah", {
        "uid": "uid_aisyah",
        "email": "aisyah@demo.com",
        "name": "Dr. Aisyah Mohd Noor",
        "role": "dietitian",
        "created_at": NOW.isoformat(),
    })
    firestore_set("users", "uid_meiling", {
        "uid": "uid_meiling",
        "email": "meiling@demo.com",
        "name": "Mei Ling Tan",
        "role": "patient",
        "dietitian_id": "uid_aisyah",
        "created_at": NOW.isoformat(),
    })
    print("✓ Users seeded (Rahman, Aisyah, Mei Ling)")


def seed_patient_profile():
    firestore_set("patients/uid_rahman/profile", "main", {
        "uid": "uid_rahman",
        "name": "Rahman bin Abdullah",
        "age": 52,
        "gender": "male",
        "weight_kg": 82,
        "height_cm": 168,
        "bmi": 29.1,
        "hba1c_percent": 8.2,
        "diagnosis_year": 2018,
        "medications": ["metformin", "glipizide"],
        "allergies": [],
        "daily_calorie_target": 1800,
        "daily_carb_target_g": 200,
        "dietitian_id": "uid_aisyah",
        "updated_at": NOW.isoformat(),
    })
    print("✓ Patient profile seeded")


def seed_meals():
    meals = [
        {
            "name": "Nasi Lemak", "traffic_light": "amber", "meal_type": "breakfast",
            "calories": 650, "carbs_g": 72, "meal_risk_score": 65,
            "nutrition_totals": {"calories_kcal": 650, "carbs_g": 72, "protein_g": 18, "fat_g": 28, "sodium_mg": 920, "glycemic_load": 38.4},
            "swap_suggestions": ["Replace coconut rice with cauliflower rice to reduce carbs by ~30g", "Opt for grilled instead of fried anchovies to cut saturated fat"],
        },
        {
            "name": "Roti Canai + Teh Tarik", "traffic_light": "red", "meal_type": "breakfast",
            "calories": 820, "carbs_g": 95, "meal_risk_score": 82,
            "nutrition_totals": {"calories_kcal": 820, "carbs_g": 95, "protein_g": 14, "fat_g": 38, "sodium_mg": 780, "glycemic_load": 52.3},
            "swap_suggestions": ["Switch to wholemeal roti with less ghee — saves ~200 kcal", "Replace Teh Tarik with unsweetened teh o to save ~60g sugar"],
        },
        {
            "name": "Nasi Goreng Ayam", "traffic_light": "amber", "meal_type": "lunch",
            "calories": 580, "carbs_g": 68, "meal_risk_score": 58,
            "nutrition_totals": {"calories_kcal": 580, "carbs_g": 68, "protein_g": 22, "fat_g": 20, "sodium_mg": 1100, "glycemic_load": 36.7},
            "swap_suggestions": ["Use brown rice to lower glycemic index", "Reduce oil and use a non-stick pan to cut ~100 kcal"],
        },
        {
            "name": "Char Kway Teow", "traffic_light": "amber", "meal_type": "lunch",
            "calories": 620, "carbs_g": 74, "meal_risk_score": 61,
            "nutrition_totals": {"calories_kcal": 620, "carbs_g": 74, "protein_g": 16, "fat_g": 24, "sodium_mg": 1350, "glycemic_load": 41.1},
            "swap_suggestions": ["Ask for less oil — sodium and fat both drop significantly", "Add extra bean sprouts and reduce noodle portion by 30%"],
        },
        {
            "name": "Oat Porridge + Telur", "traffic_light": "green", "meal_type": "breakfast",
            "calories": 380, "carbs_g": 42, "meal_risk_score": 28,
            "nutrition_totals": {"calories_kcal": 380, "carbs_g": 42, "protein_g": 18, "fat_g": 10, "sodium_mg": 340, "glycemic_load": 19.6},
            "swap_suggestions": [],
        },
        {
            "name": "Ikan Bakar + Sayur", "traffic_light": "green", "meal_type": "dinner",
            "calories": 420, "carbs_g": 35, "meal_risk_score": 22,
            "nutrition_totals": {"calories_kcal": 420, "carbs_g": 35, "protein_g": 38, "fat_g": 12, "sodium_mg": 580, "glycemic_load": 16.8},
            "swap_suggestions": [],
        },
        {
            "name": "Laksa", "traffic_light": "amber", "meal_type": "lunch",
            "calories": 540, "carbs_g": 62, "meal_risk_score": 54,
            "nutrition_totals": {"calories_kcal": 540, "carbs_g": 62, "protein_g": 20, "fat_g": 22, "sodium_mg": 1240, "glycemic_load": 34.5},
            "swap_suggestions": ["Request half-portion noodles with extra tofu for more protein and fewer carbs", "Avoid drinking the coconut milk broth — cuts ~15g fat"],
        },
    ]
    for i, meal in enumerate(meals):
        meal_id = str(uuid.uuid4())
        ts = (NOW - timedelta(days=6 - i)).replace(hour=12, minute=0, second=0).isoformat()
        firestore_set(f"patients/uid_rahman/meals", meal_id, {
            "meal_id": meal_id,
            "patient_id": "uid_rahman",
            "timestamp": ts,
            **meal,
        })
    print("✓ 7 days of meals seeded")


def seed_glucose():
    readings = [
        5.8, 7.2, 9.4, 6.1, 8.8, 11.2, 5.5,
        6.9, 7.8, 10.1, 5.2, 8.4, 9.9, 6.3,
    ]
    for i, val in enumerate(readings):
        reading_id = str(uuid.uuid4())
        ts = (NOW - timedelta(days=13 - i)).replace(hour=8, minute=0, second=0).isoformat()
        firestore_set("patients/uid_rahman/glucose", reading_id, {
            "reading_id": reading_id,
            "patient_id": "uid_rahman",
            "value_mmol": val,
            "timestamp": ts,
        })
    print("✓ 14 days of glucose readings seeded")


def seed_meiling_profile():
    firestore_set("patients/uid_meiling/profile", "main", {
        "uid": "uid_meiling",
        "name": "Mei Ling Tan",
        "age": 45,
        "gender": "female",
        "weight_kg": 68,
        "height_cm": 158,
        "bmi": 27.2,
        "hba1c_percent": 7.1,
        "diagnosis_year": 2022,
        "medications": ["metformin"],
        "allergens": ["shellfish"],
        "daily_calorie_target": 1600,
        "daily_carb_target_g": 150,
        "assigned_dietitian": "uid_aisyah",
        "updated_at": NOW.isoformat(),
    })
    # Seed 5 recent meals for Mei Ling
    ml_meals = [
        {
            "name": "Chicken Rice", "traffic_light": "amber", "meal_type": "lunch",
            "calories": 520, "carbs_g": 60, "meal_risk_score": 48,
            "nutrition_totals": {"calories_kcal": 520, "carbs_g": 60, "protein_g": 28, "fat_g": 14, "sodium_mg": 680, "glycemic_load": 32.4},
            "swap_suggestions": ["Choose steamed over roasted chicken to reduce fat", "Ask for brown rice if available"],
        },
        {
            "name": "Wonton Noodle Soup", "traffic_light": "green", "meal_type": "lunch",
            "calories": 420, "carbs_g": 52, "meal_risk_score": 32,
            "nutrition_totals": {"calories_kcal": 420, "carbs_g": 52, "protein_g": 20, "fat_g": 8, "sodium_mg": 820, "glycemic_load": 28.6},
            "swap_suggestions": [],
        },
        {
            "name": "Yong Tau Foo", "traffic_light": "green", "meal_type": "dinner",
            "calories": 380, "carbs_g": 40, "meal_risk_score": 25,
            "nutrition_totals": {"calories_kcal": 380, "carbs_g": 40, "protein_g": 22, "fat_g": 10, "sodium_mg": 560, "glycemic_load": 21.2},
            "swap_suggestions": [],
        },
        {
            "name": "Curry Mee", "traffic_light": "red", "meal_type": "lunch",
            "calories": 690, "carbs_g": 78, "meal_risk_score": 72,
            "nutrition_totals": {"calories_kcal": 690, "carbs_g": 78, "protein_g": 18, "fat_g": 32, "sodium_mg": 1450, "glycemic_load": 44.2},
            "swap_suggestions": ["Avoid drinking the curry broth — cuts ~20g fat and 600mg sodium", "Request half noodles, double tofu for better protein ratio"],
        },
        {
            "name": "Mixed Veg Rice", "traffic_light": "green", "meal_type": "dinner",
            "calories": 440, "carbs_g": 48, "meal_risk_score": 29,
            "nutrition_totals": {"calories_kcal": 440, "carbs_g": 48, "protein_g": 16, "fat_g": 12, "sodium_mg": 480, "glycemic_load": 25.4},
            "swap_suggestions": [],
        },
    ]
    for i, meal in enumerate(ml_meals):
        meal_id = str(uuid.uuid4())
        ts = (NOW - timedelta(days=4 - i)).replace(hour=13, minute=0, second=0).isoformat()
        firestore_set("patients/uid_meiling/meals", meal_id, {
            "meal_id": meal_id,
            "patient_id": "uid_meiling",
            "timestamp": ts,
            **meal,
        })
    # Seed 7 glucose readings for Mei Ling
    ml_glucose = [5.4, 6.8, 7.9, 5.1, 7.2, 6.5, 8.1]
    for i, val in enumerate(ml_glucose):
        reading_id = str(uuid.uuid4())
        ts = (NOW - timedelta(days=6 - i)).replace(hour=7, minute=30, second=0).isoformat()
        firestore_set("patients/uid_meiling/glucose", reading_id, {
            "reading_id": reading_id,
            "patient_id": "uid_meiling",
            "value_mmol": val,
            "timestamp": ts,
        })
    print("✓ Mei Ling profile, meals, and glucose seeded")


if __name__ == "__main__":
    seed_users()
    seed_patient_profile()
    seed_meals()
    seed_glucose()
    seed_meiling_profile()
    print("\n✅ Seed complete")
    print("   Demo accounts:")
    print("   Patient 1 : rahman@demo.com / demo123")
    print("   Patient 2 : meiling@demo.com / demo123")
    print("   Dietitian : aisyah@demo.com / demo123")
