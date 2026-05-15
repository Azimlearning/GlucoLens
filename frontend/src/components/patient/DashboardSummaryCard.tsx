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

function StatPill({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 border border-slate-100 px-2 sm:px-3 py-3 text-center">
      <p className="text-[10px] sm:text-xs text-slate-400 mb-0.5 truncate">{label}</p>
      <p className={`text-base font-bold truncate ${color ?? "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export function DashboardSummaryCard({ uid, name }: Props) {
  const { readings, loading: glucLoading } = useRecentGlucose(uid, 14)
  const { meals, loading: mealLoading } = useRecentMeals(uid, 7)
  const dashboard = useRealtimeDashboard(uid)

  // Trigger dashboard refresh on mount so RTDB gets the AI summary
  useEffect(() => {
    if (!uid) return
    api.getDashboard().catch(() => {/* silent */})
  }, [uid])

  const loading = glucLoading || mealLoading

  // Compute quick stats
  const avgGlucose = readings.length
    ? (readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length).toFixed(1)
    : null

  const glucColor = avgGlucose
    ? parseFloat(avgGlucose) > 10 ? "text-red-600"
      : parseFloat(avgGlucose) > 7.8 ? "text-amber-600"
      : "text-emerald-600"
    : "text-slate-400"

  const riskScores = meals
    .map((m) => (m as any).risk_score ?? (m as any).meal_risk_score ?? null)
    .filter((v): v is number => v !== null)

  const avgRisk = riskScores.length
    ? Math.round(riskScores.reduce((s, v) => s + v, 0) / riskScores.length)
    : null

  const riskColor = avgRisk !== null
    ? avgRisk >= 70 ? "text-red-600" : avgRisk >= 40 ? "text-amber-600" : "text-emerald-600"
    : "text-slate-400"

  const aiSummary: string | null = dashboard?.summary ?? null

  return (
    <Card>
      {/* Greeting */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400">{greeting()}</p>
          <h2 className="text-base font-bold text-slate-800">{name ?? "—"}</h2>
        </div>
        <span className="text-2xl">👋</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill
            label="Avg Glucose"
            value={avgGlucose ? `${avgGlucose}` : "—"}
            sub={avgGlucose ? "mmol/L" : "no data"}
            color={glucColor}
          />
          <StatPill
            label="Meals"
            value={String(meals.length)}
            sub="this week"
          />
          <StatPill
            label="Avg Risk"
            value={avgRisk !== null ? `${avgRisk}` : "—"}
            sub="/ 100"
            color={riskColor}
          />
        </div>
      )}

      {/* AI summary from dashboard agent */}
      {aiSummary && (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5">
          <p className="text-xs font-medium text-brand-600 mb-0.5">AI Insight</p>
          <p className="text-sm text-slate-700">{aiSummary}</p>
        </div>
      )}
    </Card>
  )
}
