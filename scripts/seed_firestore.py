"""Seed Firestore with demo users, Rahman's profile, 7 days of meals, 14 days of glucose."""
import sys
import os
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa: F401 — triggers .env load
from backend.tools.firebase_tools import firestore_set, firestore_client

NOW = datetime.now(timezone.utc)


def seed_users():
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
    print("✓ Users seeded")


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
        {"name": "Nasi Lemak", "traffic_light": "amber", "calories": 650, "carbs_g": 72, "meal_risk_score": 6.5},
        {"name": "Roti Canai + Teh Tarik", "traffic_light": "red", "calories": 820, "carbs_g": 95, "meal_risk_score": 8.2},
        {"name": "Nasi Goreng Ayam", "traffic_light": "amber", "calories": 580, "carbs_g": 68, "meal_risk_score": 5.8},
        {"name": "Char Kway Teow", "traffic_light": "amber", "calories": 620, "carbs_g": 74, "meal_risk_score": 6.1},
        {"name": "Oat Porridge + Telur", "traffic_light": "green", "calories": 380, "carbs_g": 42, "meal_risk_score": 2.8},
        {"name": "Ikan Bakar + Sayur", "traffic_light": "green", "calories": 420, "carbs_g": 35, "meal_risk_score": 2.2},
        {"name": "Laksa", "traffic_light": "amber", "calories": 540, "carbs_g": 62, "meal_risk_score": 5.4},
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


if __name__ == "__main__":
    seed_users()
    seed_patient_profile()
    seed_meals()
    seed_glucose()
    print("\n✅ Seed complete")
