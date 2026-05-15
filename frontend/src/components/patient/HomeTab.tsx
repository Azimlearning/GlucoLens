/**
 * HomeTab — Daily dashboard
 * Shows: greeting, 3 stat summary, AI insight, blood glucose mini, today's meals
 */
import { useAuth } from "@/contexts/AuthContext"
import { DashboardSummaryCard } from "./DashboardSummaryCard"
import { AlertFeed } from "./AlertFeed"
import { GlucoseLog } from "./GlucoseLog"
import { useTabNavigation } from "./PatientLayout"
import { useRecentMeals } from "@/hooks/usePatientData"
import type { MealRecord } from "@/lib/types"

function riskDot(score?: number) {
  if (!score && score !== 0) return "bg-gl-stone-300"
  if (score >= 70) return "bg-gl-red"
  if (score >= 40) return "bg-gl-amber"
  return "bg-gl-green"
}

function mealKcal(m: MealRecord) {
  return m.nutrition_totals?.calories_kcal ?? m.calories ?? 0
}

export function HomeTab() {
  const { user } = useAuth()
  const uid = user?.uid ?? ""
  const { goTo } = useTabNavigation()
  const { meals, loading: mloading } = useRecentMeals(uid, 10)

  // Today's meals only
  const todayStr = new Date().toDateString()
  const todayMeals = meals.filter((m) => new Date(m.timestamp).toDateString() === todayStr)

  return (
    <div className="space-y-4">
      {/* Greeting + stats + AI insight */}
      <DashboardSummaryCard uid={uid} name={user?.name} />

      {/* Alert feed */}
      <AlertFeed />

      {/* Blood Glucose mini section */}
      <GlucoseLog />

      {/* Today's meals compact list */}
      <div className="rounded-xl border border-gl-stone-100 bg-gl-bg-elev shadow-gl-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gl-stone-100">
          <h2 className="text-sm font-semibold text-gl-ink">Today&apos;s Meals</h2>
          <button
            onClick={() => goTo("trends")}
            className="text-xs text-brand-500 font-medium hover:underline"
          >
            See all →
          </button>
        </div>

        {mloading ? (
          <p className="text-xs text-gl-stone-400 text-center py-6">Loading…</p>
        ) : todayMeals.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gl-stone-400">No meals logged yet today.</p>
            <button
              onClick={() => goTo("log")}
              className="mt-3 text-xs font-semibold text-brand-500 hover:underline"
            >
              Log your first meal →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gl-stone-100">
            {todayMeals.map((m) => {
              const score = m.meal_risk_score ?? m.risk_score
              const kcal  = Math.round(mealKcal(m))
              const time  = new Date(m.timestamp).toLocaleTimeString("en-MY", {
                hour: "numeric", minute: "2-digit", hour12: true,
              })
              return (
                <li key={m.meal_id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${riskDot(score)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gl-ink truncate">{m.name}</p>
                    <p className="text-xs text-gl-stone-400">{time}</p>
                  </div>
                  <span className="text-xs font-mono text-gl-stone-500 shrink-0">{kcal} kcal</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
