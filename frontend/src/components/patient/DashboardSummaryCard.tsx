import { useEffect } from "react"
import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { AgentTag } from "@/components/shared/AgentTag"
import { useRecentGlucose, useRecentMeals } from "@/hooks/usePatientData"
import { api } from "@/lib/api"

interface Props {
  uid: string
  name?: string
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function StatBlock({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="min-w-0 rounded-md bg-gl-stone-50 border border-gl-stone-100 px-2 sm:px-3 py-3 text-center">
      <p className="text-[10px] sm:text-xs text-gl-stone-400 mb-0.5 truncate uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold font-mono-gl truncate ${color ?? "text-gl-ink"}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-gl-stone-300 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export function DashboardSummaryCard({ uid, name }: Props) {
  const { readings, loading: glucLoading } = useRecentGlucose(uid, 14)
  // Fetch 50 so we can accurately count this-week meals regardless of daily logging volume
  const { meals, loading: mealLoading } = useRecentMeals(uid, 50)

  useEffect(() => {
    if (!uid) return
    api.getDashboard().catch(() => {/* silent */})
  }, [uid])

  const loading = glucLoading || mealLoading

  const avgGlucose = readings.length
    ? (readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length).toFixed(1)
    : null

  const glucColor = avgGlucose
    ? parseFloat(avgGlucose) > 10 ? "text-gl-red"
      : parseFloat(avgGlucose) > 7.8 ? "text-gl-amber"
        : "text-gl-green"
    : "text-gl-stone-400"

  // Real this-week meal count: filter the last 7 calendar days by local date
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const thisWeekMeals = meals.filter((m) => {
    const ts = (m as any).timestamp ?? ""
    return ts ? new Date(ts) >= sevenDaysAgo : false
  })

  const riskScores = thisWeekMeals
    .map((m) => (m as any).risk_score ?? (m as any).meal_risk_score ?? null)
    .filter((v): v is number => v !== null)

  const avgRisk = riskScores.length
    ? Math.round(riskScores.reduce((s, v) => s + v, 0) / riskScores.length)
    : null

  const riskColor = avgRisk !== null
    ? avgRisk >= 70 ? "text-gl-red" : avgRisk >= 40 ? "text-gl-amber" : "text-gl-green"
    : "text-gl-stone-400"

  // Dynamically derived insight — reflects actual data state
  let aiSummary: string
  if (loading) {
    aiSummary = "Analysing your data…"
  } else if (thisWeekMeals.length === 0) {
    aiSummary = "Log your first meal this week to get personalised clinical insights."
  } else if (avgRisk !== null && avgRisk >= 70) {
    aiSummary = "Your recent meals show a high clinical risk. Focus on reducing carbohydrates and sodium intake today."
  } else if (avgRisk !== null && avgRisk >= 40) {
    aiSummary = "Some recent meals show moderate risk. Keep an eye on portion sizes and glycemic load."
  } else if (avgGlucose && parseFloat(avgGlucose) > 7.8) {
    aiSummary = "Your glucose is tracking above target despite healthy meals. Consider reviewing your medication timing with your dietitian."
  } else if (avgGlucose && parseFloat(avgGlucose) <= 7.8 && thisWeekMeals.length > 0) {
    aiSummary = "Your recent meals and glucose levels are tracking well within healthy ranges. Keep up the good work!"
  } else {
    aiSummary = "Your data is looking good this week. Keep logging meals to maintain accurate insights."
  }

  return (
    <Card>
      {/* Greeting */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gl-stone-400 uppercase tracking-wide">{greeting()}</p>
          <h2 className="text-h4 font-semibold text-gl-ink mt-0.5">{name ?? "—"}</h2>
        </div>
        {/* Wave SVG */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M7 14 C9 10, 12 10, 14 14 C16 18, 19 18, 21 14" stroke="#C8893A" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M4 19 C6 15, 9 15, 11 19 C13 23, 16 23, 18 19" stroke="#E2B469" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
        </svg>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBlock
            label="Avg Glucose"
            value={avgGlucose ? `${avgGlucose}` : "—"}
            sub={avgGlucose ? "mmol/L" : "no data"}
            color={glucColor}
          />
          <StatBlock
            label="Meals"
            value={String(thisWeekMeals.length)}
            sub="this week"
          />
          <StatBlock
            label="Avg Risk"
            value={avgRisk !== null ? `${avgRisk}` : "—"}
            sub="/ 100"
            color={riskColor}
          />
        </div>
      )}

      {/* AI insight strip — always visible, data-driven message */}
      <div className="rounded-md bg-brand-50 border border-brand-100 px-3.5 py-3">
        <p className="text-xs font-semibold text-brand-600 mb-0.5 uppercase tracking-wide">AI Insight</p>
        <p className="text-sm text-gl-ink-soft leading-relaxed">{aiSummary}</p>
        <AgentTag label="Clinical review" agent={3} />
      </div>
    </Card>
  )
}
