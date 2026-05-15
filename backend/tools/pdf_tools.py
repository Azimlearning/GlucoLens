"""
ReportLab PDF helpers for Agent 6 (Dietitian Report).

The weekly clinical brief layout lives here so the agent stays focused on data.
"""
import io
from datetime import datetime
from typing import Any

import matplotlib
matplotlib.use("Agg")  # Headless backend — required on servers
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Image, Table, TableStyle,
    Spacer,
)


# === Styles ===

_styles = getSampleStyleSheet()
_styles.add(ParagraphStyle(
    name="ClinicalH1", parent=_styles["Heading1"],
    fontSize=20, textColor=colors.HexColor("#0f172a"), spaceAfter=10,
))
_styles.add(ParagraphStyle(
    name="ClinicalH2", parent=_styles["Heading2"],
    fontSize=14, textColor=colors.HexColor("#334155"), spaceBefore=14, spaceAfter=6,
))
_styles.add(ParagraphStyle(
    name="ClinicalBody", parent=_styles["BodyText"],
    fontSize=10, leading=14, textColor=colors.HexColor("#1e293b"),
))
_styles.add(ParagraphStyle(
    name="ClinicalSmall", parent=_styles["BodyText"],
    fontSize=8, textColor=colors.HexColor("#64748b"),
))


# === Chart generation ===

def generate_trend_chart_png(daily: dict[str, list]) -> bytes:
    """Render a daily nutrient-trend line chart and return PNG bytes.

    `daily` must contain:
      - days:        list[str]  (e.g. ["Mon", "Tue", ...])
      - avg_carbs:   list[float]
      - avg_gl:      list[float]
      - avg_sodium:  list[float]
      - target_carbs:  float
      - target_gl:     float
    """
    fig, ax1 = plt.subplots(figsize=(7.0, 3.0), dpi=140)

    ax1.plot(daily["days"], daily["avg_carbs"], marker="o", linewidth=2, color="#2563eb", label="Carbs (g)")
    ax1.plot(daily["days"], daily["avg_gl"], marker="s", linewidth=2, color="#dc2626", label="GL")
    ax1.axhline(daily.get("target_carbs", 45), color="#2563eb", linestyle="--", alpha=0.3)
    ax1.axhline(daily.get("target_gl", 15), color="#dc2626", linestyle="--", alpha=0.3)
    ax1.set_ylabel("Carbs (g) / GL")
    ax1.grid(True, alpha=0.2)
    ax1.legend(loc="upper left", fontsize=8, framealpha=0.9)
    ax1.set_title("Weekly Nutrition Trend", fontsize=11, pad=10)

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=140, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()


# === Document assembly ===

def build_weekly_brief_pdf(data: dict[str, Any]) -> bytes:
    """Build the weekly clinical brief PDF. Returns raw PDF bytes.

    Expected `data` keys:
      patient_name, week_range, profile, summary, alerts, misinfo, chart_png
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.0 * cm, rightMargin=2.0 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title=f"GlucoLens Weekly Brief – {data['patient_name']}",
    )
    story: list = []

    # Header
    story.append(Paragraph("GlucoLens Weekly Clinical Brief", _styles["ClinicalH1"]))
    story.append(Paragraph(
        f"<b>Patient:</b> {data['patient_name']} &nbsp; | &nbsp; "
        f"<b>Week:</b> {data['week_range']} &nbsp; | &nbsp; "
        f"<b>Generated:</b> {datetime.utcnow():%Y-%m-%d %H:%M UTC}",
        _styles["ClinicalBody"]))
    story.append(Spacer(1, 8))

    # Patient profile snapshot
    profile = data["profile"]
    story.append(Paragraph("Profile Snapshot", _styles["ClinicalH2"]))
    profile_rows = [
        ["Age", str(profile.get("age", "-"))],
        ["Conditions", ", ".join(profile.get("conditions", []))],
        ["HbA1c", f"{profile.get('hba1c', '-')}% (as of {profile.get('hba1c_date', '-')})"],
        ["Medications", ", ".join(
            m if isinstance(m, str) else f"{m.get('name', '?')} {m.get('dose', '')} {m.get('frequency', '')}".strip()
            for m in profile.get("medications", [])
        )],
    ]
    story.append(_make_table(profile_rows, col_widths=[3.5 * cm, 13 * cm]))
    story.append(Spacer(1, 10))

    # Summary stats
    s = data.get("summary", {})
    if not s.get("empty"):
        story.append(Paragraph("Week Summary", _styles["ClinicalH2"]))
        summary_rows = [
            ["Meals logged", str(s.get("total_meals", 0))],
            ["Carbs target adherence", f"{s.get('adherence_carbs_pct', 0)}%"],
            ["GL target adherence",    f"{s.get('adherence_gl_pct', 0)}%"],
            ["Sodium target adherence",f"{s.get('adherence_sodium_pct', 0)}%"],
            ["Average meal risk score",f"{s.get('avg_risk_score', 0)} / 100"],
        ]
        story.append(_make_table(summary_rows, col_widths=[6 * cm, 6 * cm]))
        story.append(Spacer(1, 10))

    # Trend chart
    if data.get("chart_png"):
        story.append(Paragraph("Daily Trend", _styles["ClinicalH2"]))
        story.append(Image(io.BytesIO(data["chart_png"]), width=16 * cm, height=6.5 * cm))
        story.append(Spacer(1, 8))

    # Worst meals
    worst = s.get("worst_meals", [])
    if worst:
        story.append(Paragraph("Highest-Risk Meals This Week", _styles["ClinicalH2"]))
        rows = [["Date", "Meal", "Risk", "Top Breach"]]
        for m in worst[:3]:
            items = ", ".join(it.get("name", "?") for it in m.get("meal_items", [])[:3])
            tl = m.get("traffic_light", {})
            if isinstance(tl, str):
                import json as _json
                try: tl = _json.loads(tl)
                except Exception: tl = {}
            breach = next((k.upper() for k, v in tl.items() if v == "red"), "-")
            rows.append([_short_date(m.get("timestamp", "")), items[:40],
                         str(m.get("risk_score", "-")), breach])
        story.append(_make_table(rows, col_widths=[2.5*cm, 8.5*cm, 1.8*cm, 3*cm], header=True))
        story.append(Spacer(1, 8))

    # Best meals
    best = s.get("best_meals", [])
    if best:
        story.append(Paragraph("Best Meals This Week", _styles["ClinicalH2"]))
        rows = [["Date", "Meal", "Risk"]]
        for m in best[:3]:
            items = ", ".join(it.get("name", "?") for it in m.get("meal_items", [])[:3])
            rows.append([_short_date(m.get("timestamp", "")), items[:50],
                         str(m.get("risk_score", "-"))])
        story.append(_make_table(rows, col_widths=[2.5*cm, 10.5*cm, 2.8*cm], header=True))
        story.append(Spacer(1, 8))

    # Alert log
    alerts = data.get("alerts", [])
    if alerts:
        story.append(Paragraph("Alert History", _styles["ClinicalH2"]))
        rows = [["Time", "Severity", "Breach", "Message"]]
        for a in alerts[:10]:
            rows.append([
                _short_date(a.get("timestamp", "")),
                a.get("severity", "-").upper(),
                a.get("breach_type", "-"),
                a.get("message", "-")[:50],
            ])
        story.append(_make_table(rows,
                     col_widths=[2.5*cm, 2.2*cm, 3*cm, 8.3*cm], header=True))
        story.append(Spacer(1, 8))

    # Misinformation queries
    misinfo = data.get("misinfo", [])
    if misinfo:
        story.append(Paragraph("Misinformation Queries Logged", _styles["ClinicalH2"]))
        rows = [["Date", "Claim (paraphrased)", "Verdict"]]
        for q in misinfo[:8]:
            rows.append([
                _short_date(q.get("timestamp", "")),
                (q.get("claim") or q.get("raw_query", ""))[:70],
                q.get("verdict", "-").replace("_", " "),
            ])
        story.append(_make_table(rows,
                     col_widths=[2.5*cm, 10.5*cm, 3*cm], header=True))
        story.append(Spacer(1, 12))

    # Notes
    story.append(Paragraph("Clinician Notes", _styles["ClinicalH2"]))
    story.append(Paragraph(
        "<i>Use this space for handwritten notes during the next consultation.</i>",
        _styles["ClinicalSmall"]))
    for _ in range(6):
        story.append(Paragraph("&nbsp;<u>&nbsp;</u>" * 60, _styles["ClinicalBody"]))
        story.append(Spacer(1, 4))

    # Footer
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "Generated by GlucoLens · Clinical decision-support tool. "
        "This report supplements, but does not replace, in-person clinical judgement.",
        _styles["ClinicalSmall"]))

    doc.build(story)
    return buf.getvalue()


# === Internal helpers ===

def _make_table(rows: list, col_widths: list, header: bool = False) -> Table:
    t = Table(rows, colWidths=col_widths)
    style = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
    ]
    if header:
        style += [
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ]
    t.setStyle(TableStyle(style))
    return t


def _short_date(iso_str: str) -> str:
    if not iso_str:
        return "-"
    try:
        s = iso_str.replace("Z", "+00:00")
        return datetime.fromisoformat(s).strftime("%a %d %b")
    except (ValueError, TypeError):
        return iso_str[:10]
