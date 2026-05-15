/**
 * WeeklyCalorieSummary — Feature 3
 * Aggregates calorie data from the last 7 days of logged meals.
 * Shows: avg / highest / lowest day stats, adherence bar,
 * daily trend line chart, and AI weekly insight.
 */
import { useMemo } from "react"
import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentMeals } from "@/hooks/usePatientData"
import { usePatientProfile } from "@/hooks/usePatientProfile"
import { useAuth } from "@/contexts/AuthContext"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, Dot,
} from "recharts"
import type { MealRecord } from "@/lib/types"

// ── Palette (matching GlucoLens design system) ──────────────────────────
const GL_SAFFRON = "#C8893A"
const GL_GREEN = "#2D5F3F"
const GL_GREEN_BG = "#D8E4D6"
const GL_RED = "#A33B2A"
const GL_RED_BG = "#ECCEC4"
const GL_AMBER = "#B7791F"
const GL_AMBER_BG = "#F5E2C0"
const GL_STONE_400 = "#8E8470"
const GL_STONE_50 = "#F7F5F1"
const GL_STONE_100 = "#EAE5DC"

// ── Helpers ──────────────────────────────────────────────────────────────

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function mealCalories(m: MealRecord): number {
  return m.nutrition_totals?.calories_kcal ?? m.calories ?? 0
}

interface DaySummary {
  date: string       // YYYY-MM-DD
  day: string       // Mon, Tue…
  calories: number
  mealCount: number
  topMeal: string
  topMealCal: number
}

function buildDaySummaries(meals: MealRecord[]): DaySummary[] {
  // Group by calendar date (local)
  const byDate: Record<string, MealRecord[]> = {}
  meals.forEach((m) => {
    const d = new Date(m.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      ; (byDate[key] ??= []).push(m)
  })

  // Last 7 distinct days, newest first
  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .map(([date, ms]) => {
      const dayObj = new Date(date + "T12:00:00")
      const sorted = [...ms].sort((a, b) => mealCalories(b) - mealCalories(a))
      return {
        date,
        day: DAY_ABBR[dayObj.getDay()],
        calories: ms.reduce((s, m) => s + mealCalories(m), 0),
        mealCount: ms.length,
        topMeal: (sorted[0] as MealRecord).name,
        topMealCal: mealCalories(sorted[0] as MealRecord),
      }
    })
    .reverse() // oldest → newest for chart
}

// ── Custom tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DaySummary & { calories: number }
  const target = payload[0]?.payload?.target as number
  const over = d.calories > target
  return (
    <div style={{
      background: "#fff", border: "1px solid #EAE5DC", borderRadius: 8,
      padding: "8px 12px", fontSize: 11, minWidth: 140,
    }}>
      <p style={{ fontWeight: 700, color: "#3D3529", marginBottom: 4 }}>{label}</p>
      <p style={{ color: over ? GL_RED : GL_GREEN, fontWeight: 700 }}>
        {Math.round(d.calories).toLocaleString()} kcal
      </p>
      <p style={{ color: GL_STONE_400 }}>{d.mealCount} meal{d.mealCount !== 1 ? "s" : ""}</p>
      {d.topMeal && (
        <p style={{ color: GL_STONE_400, marginTop: 2 }}>Top: {d.topMeal}</p>
      )}
    </div>
  )
}

// ── Stat pill ────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, bg,
}: { label: string; value: string; sub?: string; color: string; bg: string }) {
  return (
    <div className="flex-1 rounded-xl px-3 py-3 flex flex-col items-center gap-0.5" style={{ background: bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
      <p className="text-[15px] font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-center" style={{ color, opacity: 0.7 }}>{sub}</p>}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────
interface Props { uid?: string }

export function WeeklyCalorieSummary({ uid: propUid }: Props) {
  const { user } = useAuth()
  const uid = propUid ?? user?.uid ?? ""
  const { meals, loading: mealsLoading } = useRecentMeals(uid, 50)
  const { profile, loading: profileLoading } = usePatientProfile(uid)

  // Use profile target if available — never hardcode defaults when profile exists
  const calorieTarget = profile?.daily_calorie_target ?? 1800
  const loading = mealsLoading || profileLoading

  const days = useMemo(() => buildDaySummaries(meals), [meals])

  const chartData = days.map((d) => ({ ...d, target: calorieTarget }))

  const stats = useMemo(() => {
    if (!days.length) return null
    const avg = days.reduce((s, d) => s + d.calories, 0) / days.length
    const highest = days.reduce((best, d) => (d.calories > best.calories ? d : best), days[0]!)
    const lowest = days.reduce((best, d) => (d.calories < best.calories ? d : best), days[0]!)
    const withinTarget = days.filter((d) => d.calories <= calorieTarget).length
    const adherencePct = Math.round((withinTarget / days.length) * 100)
    return { avg, highest, lowest, withinTarget, adherencePct, total: days.length }
  }, [days, calorieTarget])

  if (loading) {
    return (
      <Card>
        <h2 className="text-h4 font-semibold text-gl-ink mb-1">Weekly Calorie Summary</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }

  if (!days.length) {
    return (
      <Card>
        <h2 className="text-h4 font-semibold text-gl-ink mb-1">Weekly Calorie Summary</h2>
        <p className="text-sm text-gl-stone-400 text-center py-6">
          Log a few meals to see your weekly calorie trends here.
        </p>
      </Card>
    )
  }

  const adherenceColor = !stats ? GL_STONE_400
    : stats.adherencePct >= 70 ? GL_GREEN
      : stats.adherencePct >= 40 ? GL_AMBER
        : GL_RED
  const adherenceBg = !stats ? GL_STONE_50
    : stats.adherencePct >= 70 ? GL_GREEN_BG
      : stats.adherencePct >= 40 ? GL_AMBER_BG
        : GL_RED_BG

  const maxCal = Math.max(...days.map((d) => d.calories), calorieTarget) * 1.15

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-h4 font-semibold text-gl-ink">Weekly Calorie Summary</h2>
          <p className="text-xs text-gl-stone-400 mt-0.5">
            {days[0]?.day} – {days[days.length - 1]?.day} · {days.length} days logged
          </p>
        </div>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M4 17V9a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8" stroke={GL_SAFFRON} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <line x1="2" y1="17" x2="20" y2="17" stroke={GL_SAFFRON} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex gap-2 mb-5">
          <StatCard
            label="Average" value={Math.round(stats.avg).toLocaleString()}
            sub="kcal/day" color={GL_STONE_400} bg={GL_STONE_50}
          />
          <StatCard
            label="Highest" value={Math.round(stats.highest.calories).toLocaleString()}
            sub={stats.highest.day} color={GL_RED} bg={GL_RED_BG}
          />
          <StatCard
            label="Lowest" value={Math.round(stats.lowest.calories).toLocaleString()}
            sub={stats.lowest.day} color={GL_GREEN} bg={GL_GREEN_BG}
          />
        </div>
      )}

      {/* Adherence bar */}
      {stats && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gl-stone-400 font-medium">
              Calorie target adherence
              <span className="text-gl-stone-300 ml-1">({calorieTarget.toLocaleString()} kcal/day)</span>
            </span>
            <span className="font-bold" style={{ color: adherenceColor }}>
              {stats.adherencePct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: GL_STONE_100 }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${stats.adherencePct}%`, background: adherenceColor }}
            />
          </div>
          <p className="text-[10px] text-gl-stone-300 mt-1">
            {stats.withinTarget} of {stats.total} days within target
          </p>
        </div>
      )}

      {/* Daily trend chart */}
      <p className="text-[10px] font-semibold text-gl-stone-400 mb-2 uppercase tracking-wide">Daily Calorie Trend</p>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: GL_STONE_400 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(maxCal / 200) * 200]}
            tick={{ fontSize: 9, fill: GL_STONE_400 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            y={calorieTarget}
            stroke={GL_AMBER}
            strokeDasharray="5 3"
            label={{ value: "Target", fontSize: 8, fill: GL_AMBER, position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="calories"
            stroke={GL_SAFFRON}
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props
              const over = payload.calories > calorieTarget
              return (
                <circle
                  key={`dot-${payload.day}`}
                  cx={cx} cy={cy} r={4}
                  fill={over ? GL_RED : GL_GREEN}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              )
            }}
            activeDot={{ r: 6, fill: GL_SAFFRON }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-2 mb-5">
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: GL_RED }}>
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GL_RED }} />
          Over target
        </span>
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: GL_GREEN }}>
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GL_GREEN }} />
          On / under target
        </span>
      </div>

      {/* Highest day drill-down */}
      {stats && (
        <div
          className="rounded-lg px-4 py-3 border"
          style={{ background: GL_RED_BG, borderColor: `${GL_RED}30` }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: GL_RED }}>
            Highest day — {stats.highest.day}
          </p>
          <p className="text-sm text-gl-ink">
            <span className="font-bold font-mono">{Math.round(stats.highest.calories).toLocaleString()} kcal</span>
            {" "}&mdash; top meal:{" "}
            <span className="font-semibold">{stats.highest.topMeal}</span>
            {" "}({Math.round(stats.highest.topMealCal)} kcal)
          </p>
        </div>
      )}
    </Card>
  )
}
