import { useEffect } from "react"
import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentGlucose, useRecentMeals } from "@/hooks/usePatientData"
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard"
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
  const { meals,    loading: mealLoading } = useRecentMeals(uid, 7)
  const dashboard = useRealtimeDashboard(uid)

  useEffect(() => {
    if (!uid) return
    api.getDashboard().catch(() => {/* silent */})
  }, [uid])

  const loading = glucLoading || mealLoading

  const avgGlucose = readings.length
    ? (readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length).toFixed(1)
    : null

  const glucColor = avgGlucose
    ? parseFloat(avgGlucose) > 10   ? "text-gl-red"
      : parseFloat(avgGlucose) > 7.8 ? "text-gl-amber"
      : "text-gl-green"
    : "text-gl-stone-400"

  const riskScores = meals
    .map((m) => (m as any).risk_score ?? (m as any).meal_risk_score ?? null)
    .filter((v): v is number => v !== null)

  const avgRisk = riskScores.length
    ? Math.round(riskScores.reduce((s, v) => s + v, 0) / riskScores.length)
    : null

  const riskColor = avgRisk !== null
    ? avgRisk >= 70 ? "text-gl-red" : avgRisk >= 40 ? "text-gl-amber" : "text-gl-green"
    : "text-gl-stone-400"

  const aiSummary: string | null = dashboard?.summary ?? null

  return (
    <Card>
      {/* Greeting */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gl-stone-400 uppercase tracking-wide">{greeting()}</p>
          <h2 className="text-h4 font-semibold text-gl-ink mt-0.5">{name ?? "—"}</h2>
        </div>
        {/* Wave SVG — no emoji */}
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
            value={String(meals.length)}
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

      {/* AI insight strip */}
      {aiSummary && (
        <div className="rounded-md bg-brand-50 border border-brand-100 px-3.5 py-3">
          <p className="text-xs font-semibold text-brand-600 mb-0.5 uppercase tracking-wide">AI Insight</p>
          <p className="text-sm text-gl-ink-soft leading-relaxed">{aiSummary}</p>
        </div>
      )}
    </Card>
  )
}
