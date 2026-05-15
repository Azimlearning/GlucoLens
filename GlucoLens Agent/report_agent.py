"""
Agent 6 — Dietitian Report Agent

Job: Generate a weekly PDF clinical brief for a dietitian, one per patient.

Inputs from state:
  - event_type == "weekly_report"
  - patient_id

Outputs to state:
  - pdf_url: str
"""
from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from backend.models.state import GlucoLensState
from backend.tools import firebase_tools, pdf_tools
from backend.tools.normalize import parse_iso
from backend.utils.logging import agent_logger

log = agent_logger("report")


# === Tools ===

def fetch_week_meals(patient_id: str, week_offset: int = 0) -> list[dict]:
    """Fetch all meals for a 7-day window (week_offset=0 = current week, ending now)."""
    end = datetime.now(timezone.utc) - timedelta(days=week_offset * 7)
    start = end - timedelta(days=7)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("meals") \
            .where("timestamp", ">=", start.isoformat().replace("+00:00", "Z")) \
            .where("timestamp", "<=", end.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() | {"id": doc.id} for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        log.warning("report_fetch_meals_failed", patient_id=patient_id)
        return []


def fetch_week_glucose(patient_id: str, week_offset: int = 0) -> list[dict]:
    end = datetime.now(timezone.utc) - timedelta(days=week_offset * 7)
    start = end - timedelta(days=7)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("glucose") \
            .where("timestamp", ">=", start.isoformat().replace("+00:00", "Z")) \
            .where("timestamp", "<=", end.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        return []


def fetch_alert_history(patient_id: str, week_offset: int = 0) -> list[dict]:
    end = datetime.now(timezone.utc) - timedelta(days=week_offset * 7)
    start = end - timedelta(days=7)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("alerts") \
            .where("timestamp", ">=", start.isoformat().replace("+00:00", "Z")) \
            .where("timestamp", "<=", end.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        return []


def fetch_misinformation_queries(patient_id: str, week_offset: int = 0) -> list[dict]:
    end = datetime.now(timezone.utc) - timedelta(days=week_offset * 7)
    start = end - timedelta(days=7)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("misinfo_log") \
            .where("timestamp", ">=", start.isoformat().replace("+00:00", "Z")) \
            .where("timestamp", "<=", end.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        return []


def calculate_week_summary(meals: list[dict], targets: dict) -> dict:
    """Compute adherence %, avg risk, worst/best meals."""
    n = len(meals)
    if n == 0:
        return {"empty": True}

    tc = float(targets.get("carbs_g_per_meal", 45))
    tg = float(targets.get("glycemic_load_per_meal", 15))
    ts = float(targets.get("sodium_mg_per_meal", 600))

    breaches_c  = sum(1 for m in meals if float(m.get("nutrition_totals", {}).get("carbs_g", 0)) > tc)
    breaches_gl = sum(1 for m in meals if float(m.get("nutrition_totals", {}).get("glycemic_load", 0)) > tg)
    breaches_s  = sum(1 for m in meals if float(m.get("nutrition_totals", {}).get("sodium_mg", 0)) > ts)

    by_risk = sorted(meals, key=lambda m: m.get("risk_score", 0), reverse=True)
    risks = [m.get("risk_score", 0) for m in meals]
    return {
        "total_meals":         n,
        "adherence_carbs_pct": round((1 - breaches_c / n) * 100, 1),
        "adherence_gl_pct":    round((1 - breaches_gl / n) * 100, 1),
        "adherence_sodium_pct":round((1 - breaches_s / n) * 100, 1),
        "avg_risk_score":      round(statistics.mean(risks), 1) if risks else 0,
        "worst_meals":         by_risk[:3],
        "best_meals":          list(reversed(by_risk[-3:])),
        "empty":               False,
    }


def generate_trend_chart(meals: list[dict], targets: dict) -> bytes:
    """Build the daily-trend chart from meals + targets."""
    by_day: dict[str, dict[str, list[float]]] = defaultdict(
        lambda: {"carbs": [], "gl": [], "sodium": []})
    for m in meals:
        try:
            d = parse_iso(m["timestamp"]).strftime("%a")
        except (ValueError, TypeError, KeyError):
            continue
        n = m.get("nutrition_totals", {}) or {}
        by_day[d]["carbs"].append(float(n.get("carbs_g", 0)))
        by_day[d]["gl"].append(float(n.get("glycemic_load", 0)))
        by_day[d]["sodium"].append(float(n.get("sodium_mg", 0)))

    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = [d for d in days_order if d in by_day]
    if not days:
        days = days_order

    avg_carbs = [round(statistics.mean(by_day[d]["carbs"]), 1) if by_day.get(d, {}).get("carbs") else 0
                 for d in days]
    avg_gl = [round(statistics.mean(by_day[d]["gl"]), 1) if by_day.get(d, {}).get("gl") else 0
              for d in days]
    avg_sodium = [round(statistics.mean(by_day[d]["sodium"]), 1) if by_day.get(d, {}).get("sodium") else 0
                  for d in days]

    return pdf_tools.generate_trend_chart_png({
        "days":         days,
        "avg_carbs":    avg_carbs,
        "avg_gl":       avg_gl,
        "avg_sodium":   avg_sodium,
        "target_carbs": float(targets.get("carbs_g_per_meal", 45)),
        "target_gl":    float(targets.get("glycemic_load_per_meal", 15)),
    })


def compile_pdf_report(data: dict) -> bytes:
    """Render the full weekly clinical brief as PDF bytes."""
    return pdf_tools.build_weekly_brief_pdf(data)


def upload_pdf_to_storage(patient_id: str, pdf_bytes: bytes) -> str:
    """Upload PDF to Firebase Storage and return a 7-day signed URL."""
    week_label = datetime.now(timezone.utc).strftime("%Y_%W")
    path = f"reports/{patient_id}/weekly_{week_label}_{uuid4().hex[:6]}.pdf"
    return firebase_tools.upload_bytes_to_storage(
        path, pdf_bytes, content_type="application/pdf", signed_url_days=7)


def notify_dietitian(dietitian_id: str, pdf_url: str, patient_name: str) -> None:
    """Drop an in-app notification on the dietitian's RTDB channel."""
    if not dietitian_id:
        return
    notif_id = uuid4().hex
    firebase_tools.push_realtime_child(
        f"/dashboard/{dietitian_id}/notifications",
        notif_id,
        {
            "id": notif_id,
            "type": "weekly_report_ready",
            "patient_name": patient_name,
            "pdf_url": pdf_url,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "seen": False,
        },
    )


def _format_week_range() -> str:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    return f"{start.strftime('%d %b')} – {end.strftime('%d %b %Y')}"


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    if state.get("event_type") != "weekly_report":
        return {}

    pid = state.get("patient_id", "")
    if not pid:
        return {"pdf_url": ""}

    log.info("report_entering", patient_id=pid)

    try:
        profile = firebase_tools.fetch_patient_profile(pid) or {}
        user = firebase_tools.fetch_user(pid) or {}
        meals = fetch_week_meals(pid)
        alerts = fetch_alert_history(pid)
        misinfo = fetch_misinformation_queries(pid)

        summary = calculate_week_summary(meals, profile.get("targets", {}))
        chart_png = generate_trend_chart(meals, profile.get("targets", {})) if meals else b""

        pdf_bytes = compile_pdf_report({
            "patient_name": user.get("displayName", "Patient"),
            "profile":      profile,
            "summary":      summary,
            "chart_png":    chart_png,
            "alerts":       alerts,
            "misinfo":      misinfo,
            "week_range":   _format_week_range(),
        })

        pdf_url = upload_pdf_to_storage(pid, pdf_bytes)
        notify_dietitian(
            profile.get("assigned_dietitian", ""),
            pdf_url,
            user.get("displayName", "Patient"),
        )

        log.info("report_done", pdf_url=pdf_url, meals=len(meals))
        return {"pdf_url": pdf_url}

    except Exception as e:  # noqa: BLE001
        log.exception("report_failure")
        return {
            "pdf_url": "",
            "errors": (state.get("errors") or []) + [{"agent": "report", "error": str(e)}],
        }
