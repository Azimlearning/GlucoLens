"""Pre-generate Rahman's weekly PDF as a backup for demos."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa
from backend.tools.firebase_tools import fetch_patient_profile, fetch_user, firestore_client
from backend.tools.pdf_tools import generate_trend_chart_png, build_weekly_brief_pdf
from datetime import datetime, timedelta, timezone

def fetch_week_meals(patient_id, days=7):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    docs = firestore_client().collection("patients").document(patient_id)\
        .collection("meals").where("timestamp", ">=", cutoff).stream()
    return [d.to_dict() for d in docs]

def fetch_week_glucose(patient_id, days=7):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    docs = firestore_client().collection("patients").document(patient_id)\
        .collection("glucose").where("timestamp", ">=", cutoff).stream()
    return [d.to_dict() for d in docs]

def fetch_week_alerts(patient_id, days=7):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    docs = firestore_client().collection("patients").document(patient_id)\
        .collection("alerts").where("timestamp", ">=", cutoff).stream()
    return [d.to_dict() for d in docs]

def fetch_week_misinfo(patient_id, days=7):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    docs = firestore_client().collection("patients").document(patient_id)\
        .collection("misinfo_log").where("timestamp", ">=", cutoff).stream()
    return [d.to_dict() for d in docs]

def main():
    patient_id = "uid_rahman"
    profile = fetch_patient_profile(patient_id) or {}
    user = fetch_user(patient_id) or {"name": "Rahman bin Abdullah"}
    meals = fetch_week_meals(patient_id)
    glucose = fetch_week_glucose(patient_id)
    alerts = fetch_week_alerts(patient_id)
    misinfo = fetch_week_misinfo(patient_id)

    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%d %b %Y")
    week_end = datetime.now(timezone.utc).strftime("%d %b %Y")
    week_range = f"{week_start} – {week_end}"

    n = len(meals)
    if n == 0:
        print("No meals found — run seed_firestore.py first")
        return

    avg_carbs = [m.get("carbs_g", 0) for m in meals]
    avg_gl = [m.get("carbs_g", 0) * 0.7 for m in meals]  # rough estimate
    daily_labels = [f"Day {i+1}" for i in range(n)]

    chart_png = generate_trend_chart_png({
        "days": daily_labels,
        "avg_carbs": avg_carbs,
        "avg_gl": avg_gl,
    })

    breaches_carbs = sum(1 for m in meals if m.get("carbs_g", 0) > 60)
    summary = {
        "total_meals": n,
        "adherence_carbs_pct": round((1 - breaches_carbs / n) * 100, 1),
        "avg_risk_score": round(sum(m.get("meal_risk_score", 0) for m in meals) / n, 1),
        "worst_meals": sorted(meals, key=lambda m: m.get("meal_risk_score", 0), reverse=True)[:3],
        "best_meals": sorted(meals, key=lambda m: m.get("meal_risk_score", 0))[:3],
    }

    pdf_bytes = build_weekly_brief_pdf({
        "patient_name": user.get("name", "Rahman"),
        "profile": profile,
        "summary": summary,
        "chart_png": chart_png,
        "alerts": alerts,
        "misinfo": misinfo,
        "week_range": week_range,
    })

    out_path = os.path.join(os.path.dirname(__file__), "_backup_rahman_weekly.pdf")
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"✅ PDF saved to {out_path}")

if __name__ == "__main__":
    main()
