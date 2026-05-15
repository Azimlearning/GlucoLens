"""
Agent 4 — Glucose Correlation Agent

Job: Correlate post-meal glucose readings with meal logs to identify patient-specific
     trigger foods. For this build, runs on seeded 14-day glucose data.

Inputs from state:
  - event_type in ("glucose_entry", "dashboard_load")
  - patient_id

Outputs to state:
  - glucose_insights: list[dict]
"""
from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.models.state import GlucoLensState
from backend.tools import firebase_tools
from backend.tools.normalize import normalize_food_name, parse_iso
from backend.tools.population_averages import POPULATION_AVERAGES
from backend.utils.logging import agent_logger

log = agent_logger("glucose")


# === Constants ===

POST_MEAL_WINDOW_MIN = (90, 150)   # 90-150 minutes after meal (2hr peak)
PRE_MEAL_WINDOW_MIN = 30           # 0-30 minutes before meal


# === Tools ===

def fetch_glucose_log(patient_id: str, days: int = 14) -> list[dict]:
    """Read the last N days of glucose readings from Firestore."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("glucose") \
            .where("timestamp", ">=", cutoff.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() | {"id": doc.id} for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        log.warning("glucose_fetch_failed", patient_id=patient_id)
        return []


def fetch_meals(patient_id: str, days: int = 14) -> list[dict]:
    """Read the last N days of meals from Firestore."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        coll = firebase_tools.firestore_client() \
            .collection("patients").document(patient_id).collection("meals") \
            .where("timestamp", ">=", cutoff.isoformat().replace("+00:00", "Z")) \
            .order_by("timestamp")
        return [doc.to_dict() | {"id": doc.id} for doc in coll.stream()]
    except Exception:  # noqa: BLE001
        log.warning("meals_fetch_failed", patient_id=patient_id)
        return []


def correlate_meal_glucose(meals: list[dict], glucose: list[dict]) -> list[dict]:
    """Pair each meal with pre- and post-meal glucose readings."""
    results: list[dict] = []
    if not meals or not glucose:
        return results

    for meal in meals:
        try:
            m_time = parse_iso(meal["timestamp"])
        except (ValueError, TypeError, KeyError):
            continue

        pre = _closest_before(glucose, m_time, PRE_MEAL_WINDOW_MIN)
        post = _closest_in_window(
            glucose,
            m_time + timedelta(minutes=POST_MEAL_WINDOW_MIN[0]),
            m_time + timedelta(minutes=POST_MEAL_WINDOW_MIN[1]),
        )
        if pre and post:
            items = meal.get("meal_items", []) or []
            primary = items[0].get("name", "unknown") if items else "unknown"
            results.append({
                "meal_id": meal.get("id"),
                "meal_summary": ", ".join(i.get("name", "?") for i in items[:3]),
                "pre_glucose_mmol": pre["value_mmol"],
                "post_glucose_mmol": post["value_mmol"],
                "delta_mmol": round(post["value_mmol"] - pre["value_mmol"], 2),
                "primary_dish": primary,
                "timestamp": meal["timestamp"],
            })
    return results


def detect_trigger_foods(correlations: list[dict]) -> list[dict]:
    """Flag dishes whose mean post-meal glucose delta is in the top quartile."""
    by_dish: dict[str, list[float]] = defaultdict(list)
    for c in correlations:
        by_dish[c["primary_dish"]].append(c["delta_mmol"])

    # Only consider dishes with at least 2 occurrences
    means = [
        (dish, statistics.mean(deltas), len(deltas))
        for dish, deltas in by_dish.items()
        if len(deltas) >= 2
    ]
    if len(means) < 2:
        return [
            {"dish": dish, "avg_delta_mmol": round(m, 2), "occurrences": n}
            for dish, m, n in means
        ]

    # Top quartile threshold
    threshold = statistics.quantiles([m for _, m, _ in means], n=4)[-1]
    return [
        {"dish": dish, "avg_delta_mmol": round(m, 2), "occurrences": n}
        for dish, m, n in means
        if m >= threshold
    ]


def compare_to_population_average(patient_avg: float, dish: str) -> dict:
    """Compare this patient's avg post-meal delta against the population average for the dish."""
    pop = POPULATION_AVERAGES.get(normalize_food_name(dish))
    if not pop:
        return {"comparable": False}
    pct_diff = ((patient_avg - pop["avg_delta_mmol"]) / pop["avg_delta_mmol"]) * 100
    return {
        "comparable": True,
        "patient_avg": round(patient_avg, 2),
        "population_avg": pop["avg_delta_mmol"],
        "population_n": pop["n"],
        "pct_difference": round(pct_diff, 1),
    }


def generate_insight_card(trigger: dict, comparison: dict) -> dict:
    """Compose a structured insight for the patient dashboard."""
    pct = comparison["pct_difference"]
    severity = "high" if pct > 20 else "medium" if pct > 10 else "low"
    return {
        "headline": (
            f"You spike {pct}% more than average from {trigger['dish']}"
            if pct > 0 else
            f"You handle {trigger['dish']} better than average ({abs(pct)}% lower spike)"
        ),
        "subheadline": (
            f"Based on {trigger['occurrences']} meals over the last 14 days "
            f"(vs {comparison['population_n']} population samples)"
        ),
        "severity": severity,
        "action": (
            f"Consider reducing portion of {trigger['dish']} or pairing it with "
            f"high-fiber sides to blunt the spike."
            if pct > 0 else
            f"Keep doing what works — your response to {trigger['dish']} is favourable."
        ),
        "dish": trigger["dish"],
        "patient_avg_delta": comparison["patient_avg"],
        "population_avg_delta": comparison["population_avg"],
    }


# === Internal helpers ===

def _closest_before(readings: list[dict], target: datetime, max_minutes: int) -> Optional[dict]:
    earliest = target - timedelta(minutes=max_minutes)
    candidates = []
    for r in readings:
        try:
            t = parse_iso(r["timestamp"])
        except (ValueError, TypeError, KeyError):
            continue
        if earliest <= t <= target:
            candidates.append((t, r))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def _closest_in_window(readings: list[dict], start: datetime, end: datetime) -> Optional[dict]:
    candidates = []
    for r in readings:
        try:
            t = parse_iso(r["timestamp"])
        except (ValueError, TypeError, KeyError):
            continue
        if start <= t <= end:
            candidates.append((t, r))
    if not candidates:
        return None
    midpoint = start + (end - start) / 2
    candidates.sort(key=lambda x: abs(x[0] - midpoint))
    return candidates[0][1]


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    if state.get("event_type") not in ("glucose_entry", "dashboard_load"):
        return {}

    patient_id = state.get("patient_id") or state.get("user_id") or ""
    if not patient_id:
        return {"glucose_insights": []}

    log.info("glucose_entering", patient_id=patient_id)

    try:
        meals = fetch_meals(patient_id, days=14)
        glucose = fetch_glucose_log(patient_id, days=14)
        correlations = correlate_meal_glucose(meals, glucose)
        triggers = detect_trigger_foods(correlations)

        insights: list[dict] = []
        for t in triggers:
            comparison = compare_to_population_average(t["avg_delta_mmol"], t["dish"])
            if comparison["comparable"]:
                insights.append(generate_insight_card(t, comparison))

        # Sort by severity (high first), then pct_difference desc
        insights.sort(
            key=lambda i: (
                {"high": 0, "medium": 1, "low": 2}[i["severity"]],
                -abs(i.get("patient_avg_delta", 0) - i.get("population_avg_delta", 0)),
            ),
        )

        log.info("glucose_done", insights=len(insights))
        return {"glucose_insights": insights}

    except Exception as e:  # noqa: BLE001
        log.exception("glucose_failure")
        return {
            "glucose_insights": [],
            "errors": (state.get("errors") or []) + [{"agent": "glucose", "error": str(e)}],
        }
