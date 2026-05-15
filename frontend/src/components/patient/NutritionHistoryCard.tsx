import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useMealHistory } from "@/hooks/useMealHistory"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from "recharts"
import type { MealRecord } from "@/lib/types"

interface Props {
  uid: string
  dailyCalTarget?: number
  dailyCarbTarget?: number
}

function getMealKcal(m: MealRecord): number {
  return m.nutrition_totals?.calories_kcal ?? m.calories ?? 0
}
function getMealCarbs(m: MealRecord): number {
  return m.nutrition_totals?.carbs_g ?? m.carbs_g ?? 0
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function buildChartData(meals: MealRecord[]) {
  const today = new Date()
  const days: { label: string; date: string; kcal: number; carbs: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = i === 0 ? "Today" : DAY_LABELS[d.getDay()]
    days.push({ label, date: dateStr, kcal: 0, carbs: 0 })
  }

  for (const meal of meals) {
    const mealDate = meal.timestamp?.slice(0, 10)
    const day = days.find((d) => d.date === mealDate)
    if (day) {
      day.kcal  += getMealKcal(meal)
      day.carbs += getMealCarbs(meal)
    }
  }

  return days.map(({ label, kcal, carbs }) => ({
    label,
    Calories: Math.round(kcal),
    Carbs: Math.round(carbs),
  }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <b>{p.value}{p.name === "Calories" ? " kcal" : "g"}</b>
        </p>
      ))}
    </div>
  )
}

export function NutritionHistoryCard({ uid, dailyCalTarget = 1800, dailyCarbTarget = 130 }: Props) {
  const { meals, loading } = useMealHistory(uid, 60)
  const chartData = buildChartData(meals)

  const todayRow = chartData[chartData.length - 1]
  const todayCal  = todayRow?.Calories ?? 0
  const todayCarbs = todayRow?.Carbs ?? 0
  const calPct  = Math.min(100, Math.round((todayCal  / dailyCalTarget)  * 100))
  const carbPct = Math.min(100, Math.round((todayCarbs / dailyCarbTarget) * 100))

  const calColor  = calPct  > 110 ? "bg-red-400"    : calPct  > 85 ? "bg-amber-400"  : "bg-emerald-400"
  const carbColor = carbPct > 110 ? "bg-red-400"    : carbPct > 85 ? "bg-amber-400"  : "bg-sky-400"

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800 mb-1">7-Day Nutrition History</h2>
      <p className="text-xs text-slate-400 mb-4">Daily calorie and carb intake vs your targets</p>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {/* Today's progress bars */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <div className="flex justify-between text-xs mb-1 gap-1">
                <span className="text-slate-500 font-medium truncate">Calories</span>
                <span className="text-slate-600 font-semibold shrink-0">{todayCal}/{dailyCalTarget}kcal</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${calColor}`} style={{ width: `${calPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 text-right">{calPct}% of daily goal</p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1 gap-1">
                <span className="text-slate-500 font-medium truncate">Carbs</span>
                <span className="text-slate-600 font-semibold shrink-0">{todayCarbs}g/{dailyCarbTarget}g</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${carbColor}`} style={{ width: `${carbPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 text-right">{carbPct}% of daily goal</p>
            </div>
          </div>

          {/* 7-day chart */}
          <div className="mb-1">
            <p className="text-xs font-medium text-slate-500 mb-2">Calories (kcal)</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, Math.max(dailyCalTarget * 1.3, 500)]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={dailyCalTarget}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "Target", fontSize: 9, fill: "#f59e0b" }}
                />
                <Bar dataKey="Calories" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Carbs (g)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, Math.max(dailyCarbTarget * 1.4, 100)]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={dailyCarbTarget}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "Target", fontSize: 9, fill: "#f59e0b" }}
                />
                <Bar dataKey="Carbs" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-slate-300 mt-2 text-center">
            Targets: {dailyCalTarget} kcal · {dailyCarbTarget}g carbs (MOH T2D guidelines)
          </p>
        </>
      )}
    </Card>
  )
}
