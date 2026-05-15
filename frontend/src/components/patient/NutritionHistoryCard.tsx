import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useMealHistory } from "@/hooks/useMealHistory"
import { usePatientProfile } from "@/hooks/usePatientProfile"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import type { MealRecord } from "@/lib/types"

// GL palette hex values for Recharts
const GL_SAFFRON = "#C8893A"
const GL_TEAL = "#2D6A6A"
const GL_AMBER = "#B7791F"
const GL_STONE_400 = "#8E8470"

interface Props { uid: string }

function getMealKcal(m: MealRecord): number { return m.nutrition_totals?.calories_kcal ?? m.calories ?? 0 }
function getMealCarbs(m: MealRecord): number { return m.nutrition_totals?.carbs_g ?? m.carbs_g ?? 0 }

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function buildChartData(meals: MealRecord[]) {
  const today = new Date()
  const days: { label: string; date: string; kcal: number; carbs: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({ label: i === 0 ? "Today" : DAY_LABELS[d.getDay()], date: dateStr, kcal: 0, carbs: 0 })
  }
  for (const meal of meals) {
    const mealDate = meal.timestamp?.slice(0, 10)
    const day = days.find((d) => d.date === mealDate)
    if (day) { day.kcal += getMealKcal(meal); day.carbs += getMealCarbs(meal) }
  }
  return days.map(({ label, kcal, carbs }) => ({ label, Calories: Math.round(kcal), Carbs: Math.round(carbs) }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gl-bg-elev border border-gl-stone-100 rounded-md px-3 py-2.5 shadow-gl-sm text-xs space-y-1">
      <p className="font-semibold text-gl-ink">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono-gl" style={{ color: p.color }}>
          {p.name}: <b>{p.value}{p.name === "Calories" ? " kcal" : "g"}</b>
        </p>
      ))}
    </div>
  )
}

export function NutritionHistoryCard({ uid }: Props) {
  const { meals, loading } = useMealHistory(uid, 60)
  const { profile } = usePatientProfile(uid)
  const dailyCalTarget = profile?.daily_calorie_target ?? 1800
  const dailyCarbTarget = profile?.daily_carb_target_g ?? 130
  const chartData = buildChartData(meals)

  const todayRow = chartData[chartData.length - 1]
  const todayCal = todayRow?.Calories ?? 0
  const todayCarbs = todayRow?.Carbs ?? 0
  const calPct = Math.min(100, Math.round((todayCal / dailyCalTarget) * 100))
  const carbPct = Math.min(100, Math.round((todayCarbs / dailyCarbTarget) * 100))

  // GL traffic-light progress fill
  const calFill = calPct > 110 ? "#A33B2A" : calPct > 85 ? "#B7791F" : "#C8893A"
  const carbFill = carbPct > 110 ? "#A33B2A" : carbPct > 85 ? "#B7791F" : "#2D6A6A"

  return (
    <Card>
      <h2 className="text-h4 font-semibold text-gl-ink mb-1">7-Day Nutrition History</h2>
      <p className="text-xs text-gl-stone-400 mb-4">Daily calorie and carb intake vs your targets</p>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {/* Today's progress bars */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Calories", value: todayCal, target: dailyCalTarget, pct: calPct, unit: "kcal", fill: calFill },
              { label: "Carbs", value: todayCarbs, target: dailyCarbTarget, pct: carbPct, unit: "g", fill: carbFill },
            ].map(({ label, value, target, pct, unit, fill }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5 gap-1">
                  <span className="text-gl-stone-500 font-medium truncate">{label}</span>
                  <span className="text-gl-ink font-semibold font-mono-gl shrink-0">
                    {value}/{target}{unit}
                  </span>
                </div>
                <div className="h-2 bg-gl-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-slow"
                    style={{ width: `${pct}%`, background: fill }}
                  />
                </div>
                <p className="text-xs text-gl-stone-400 mt-0.5 text-right font-mono-gl">{pct}%</p>
              </div>
            ))}
          </div>

          {/* Calories bar chart */}
          <div className="mb-1">
            <p className="text-xs font-semibold text-gl-stone-400 mb-2 uppercase tracking-wide">Calories (kcal)</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, Math.max(dailyCalTarget * 1.3, 500)]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={dailyCalTarget}
                  stroke={GL_AMBER}
                  strokeDasharray="4 2"
                  label={{ value: "Target", fontSize: 9, fill: GL_AMBER }}
                />
                <Bar dataKey="Calories" fill={GL_SAFFRON} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Carbs bar chart */}
          <div>
            <p className="text-xs font-semibold text-gl-stone-400 mb-2 uppercase tracking-wide">Carbs (g)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, Math.max(dailyCarbTarget * 1.4, 100)]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={dailyCarbTarget}
                  stroke={GL_AMBER}
                  strokeDasharray="4 2"
                  label={{ value: "Target", fontSize: 9, fill: GL_AMBER }}
                />
                <Bar dataKey="Carbs" fill={GL_TEAL} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gl-stone-300 mt-2 text-center font-mono-gl">
            Targets: {dailyCalTarget} kcal · {dailyCarbTarget}g carbs / day
          </p>
          <p className="text-[10px] text-gl-stone-300 uppercase tracking-widest mt-2 text-center">Nutrition analysis · Agent 2</p>
        </>
      )}
    </Card>
  )
}
