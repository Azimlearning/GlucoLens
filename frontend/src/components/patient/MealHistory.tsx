/**
 * MealHistory — Enhanced food log with:
 *   A) Weekly summary strip (avg / highest / lowest kcal day)
 *   B) Risk-based filter chips (All / High / Moderate / Low)
 *   C) Date-grouped meal entries (Today · Yesterday · date)
 *   D) Expandable meal cards with nutrient bars
 *   E) Agent attribution tags
 */
import { useState, useMemo } from "react"
import { Card } from "@/components/shared/Card"
import { AgentTag } from "@/components/shared/AgentTag"
import { TrafficLightDot } from "@/components/shared/TrafficLight"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentMeals } from "@/hooks/usePatientData"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { formatTime } from "@/lib/format"
import type { MealRecord } from "@/lib/types"
import { IngredientBreakdown } from "./IngredientBreakdown"
import type { MealItemDetail } from "./IngredientBreakdown"

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskFilter = "all" | "high" | "moderate" | "low"

interface DayStat { totalKcal: number; meals: MealRecord[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: "🌅", lunch: "🌞", dinner: "🌆", snack: "🍎", unspecified: "🍽️",
}

function mealKcal(m: MealRecord): number {
  return m.nutrition_totals?.calories_kcal ?? m.calories ?? 0
}

function mealRiskLevel(m: MealRecord): RiskFilter {
  const score = m.meal_risk_score ?? m.risk_score ?? 0
  if (score >= 70) return "high"
  if (score >= 40) return "moderate"
  return "low"
}

function riskScoreNum(m: MealRecord): number {
  return m.meal_risk_score ?? m.risk_score ?? 0
}

/** Group meals by local calendar day and return sorted groups (newest first) */
function groupByDate(meals: MealRecord[]): { label: string; meals: MealRecord[] }[] {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const groups: Record<string, { label: string; meals: MealRecord[] }> = {}

  for (const m of meals) {
    const d = new Date(m.timestamp)
    const key = d.toDateString()
    let label: string
    if (key === today.toDateString()) {
      label = `Today · ${d.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`
    } else if (key === yesterday.toDateString()) {
      label = `Yesterday · ${d.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`
    } else {
      label = d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })
    }
    if (!groups[key]) groups[key] = { label, meals: [] }
    groups[key].meals.push(m)
  }

  // Sort groups newest first
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, g]) => g)
}

/** Build weekly kcal stats from the meal array */
function buildWeeklyStats(meals: MealRecord[]) {
  const byDay: Record<string, DayStat> = {}
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  for (const m of meals) {
    const d = new Date(m.timestamp)
    if (d < sevenDaysAgo) continue
    const key = d.toDateString()
    if (!byDay[key]) byDay[key] = { totalKcal: 0, meals: [] }
    byDay[key].totalKcal += mealKcal(m)
    byDay[key].meals.push(m)
  }

  const days = Object.values(byDay)
  if (!days.length) return null

  const avg = Math.round(days.reduce((s, d) => s + d.totalKcal, 0) / days.length)
  const highest = days.reduce((a, b) => a.totalKcal > b.totalKcal ? a : b)
  const lowest = days.reduce((a, b) => a.totalKcal < b.totalKcal ? a : b)
  return { avg, highest, lowest }
}

// ─── A) Weekly summary strip ───────────────────────────────────────────────────

function WeeklySummaryStrip({ meals }: { meals: MealRecord[] }) {
  const stats = buildWeeklyStats(meals)
  if (!stats) return null

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: "Avg / day", value: stats.avg.toLocaleString(), unit: "kcal", color: "text-gl-ink" },
        { label: "Highest", value: Math.round(stats.highest.totalKcal).toLocaleString(), unit: "kcal", color: "text-gl-red" },
        { label: "Lowest", value: Math.round(stats.lowest.totalKcal).toLocaleString(), unit: "kcal", color: "text-gl-green" },
      ].map(({ label, value, unit, color }) => (
        <div key={label} className="rounded-xl bg-gl-stone-50 border border-gl-stone-100 px-2 py-2.5 text-center">
          <p className="text-[9px] uppercase tracking-wide text-gl-stone-400 mb-1">{label}</p>
          <p className={`text-sm font-bold font-mono-gl ${color}`}>{value}</p>
          <p className="text-[9px] text-gl-stone-300 mt-0.5">{unit}</p>
        </div>
      ))}
    </div>
  )
}

// ─── B) Filter chips ──────────────────────────────────────────────────────────

const CHIPS: { key: RiskFilter; label: string; dot: string }[] = [
  { key: "all",      label: "All",        dot: "bg-gl-stone-300" },
  { key: "high",     label: "High risk",  dot: "bg-gl-red" },
  { key: "moderate", label: "Moderate",   dot: "bg-gl-amber" },
  { key: "low",      label: "Low risk",   dot: "bg-gl-green" },
]

function FilterChips({ active, onChange }: { active: RiskFilter; onChange: (v: RiskFilter) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
      {CHIPS.map(({ key, label, dot }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-all ${
            active === key
              ? "bg-gl-stone-100 border-gl-stone-400 text-gl-ink font-medium"
              : "bg-gl-bg-elev border-gl-stone-100 text-gl-stone-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── D) Nutrient bar ──────────────────────────────────────────────────────────

function NutrientBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const ratio = Math.min(value / target, 1)
  const pct = Math.round(ratio * 100)
  const barColor = pct > 100 ? "bg-gl-red" : pct > 85 ? "bg-gl-amber" : "bg-gl-green"
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-gl-stone-400">{label}</span>
        <span className="text-[10px] text-gl-stone-500 font-mono-gl">{Math.round(value)}{unit} <span className="text-gl-stone-300">/ {target}{unit}</span></span>
      </div>
      <div className="h-1.5 bg-gl-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
      </div>
    </div>
  )
}

// ─── D) Nutrition grid ────────────────────────────────────────────────────────

function NutrientGrid({ m }: { m: MealRecord }) {
  const t = m.nutrition_totals
  if (!t) return null
  const items = [
    { label: "Calories", value: `${Math.round(t.calories_kcal ?? 0)}`, unit: "kcal" },
    { label: "Carbs",    value: `${Math.round(t.carbs_g ?? 0)}`,       unit: "g" },
    { label: "Protein",  value: `${Math.round(t.protein_g ?? 0)}`,     unit: "g" },
    { label: "Fat",      value: `${Math.round(t.fat_g ?? 0)}`,         unit: "g" },
    { label: "Sodium",   value: `${Math.round(t.sodium_mg ?? 0)}`,     unit: "mg" },
    { label: "Gl. Load", value: `${(t.glycemic_load ?? 0).toFixed(1)}`, unit: "" },
  ]
  return (
    <div className="grid grid-cols-3 gap-1.5 mb-3">
      {items.map(({ label, value, unit }) => (
        <div key={label} className="rounded-lg bg-gl-stone-50 border border-gl-stone-100 p-2 text-center">
          <p className="text-[9px] text-gl-stone-400 uppercase tracking-wide">{label}</p>
          <p className="text-xs font-semibold text-gl-ink mt-0.5">{value}<span className="text-[9px] font-normal text-gl-stone-400 ml-0.5">{unit}</span></p>
        </div>
      ))}
    </div>
  )
}

// ─── D+E) Expandable meal card ────────────────────────────────────────────────

function ExpandableMealCard({
  meal, isExpanded, onToggle, onDelete,
}: {
  meal: MealRecord
  isExpanded: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const risk = mealRiskLevel(meal)
  const score = riskScoreNum(meal)
  const kcal = Math.round(mealKcal(meal))
  const icon = MEAL_TYPE_ICONS[meal.meal_type ?? "unspecified"] ?? "🍽️"
  const time = formatTime(meal.timestamp)
  const trafficLight = typeof meal.traffic_light === "string"
    ? (meal.traffic_light as "green" | "amber" | "red")
    : "green"

  const riskBadgeCls = risk === "high"
    ? "bg-red-100 text-red-700"
    : risk === "moderate"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700"
  const riskLabel = risk === "high" ? "High" : risk === "moderate" ? "Moderate" : "Low"

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await api.deleteMeal(meal.meal_id)
      onDelete(meal.meal_id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const t = meal.nutrition_totals

  return (
    <div
      className={`border rounded-xl overflow-hidden mb-2 transition-colors cursor-pointer ${
        isExpanded ? "border-gl-stone-200 bg-white" : "border-gl-stone-100 bg-gl-bg-elev"
      }`}
      onClick={() => onToggle(meal.meal_id)}
    >
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <TrafficLightDot value={trafficLight} />
        <span className="text-base shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gl-ink truncate">{meal.name}</p>
          <p className="text-xs text-gl-stone-400 mt-0.5">{time}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {score > 0 && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${riskBadgeCls}`}>{riskLabel}</span>
          )}
          <span className="text-xs font-mono-gl text-gl-stone-500">{kcal} kcal</span>
        </div>
        <span className="text-gl-stone-300 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gl-stone-100 px-3.5 pt-3 pb-3.5 bg-white">
          {/* Nutrient grid */}
          <NutrientGrid m={meal} />

          {/* Nutrient progress bars — against sensible per-meal targets */}
          {t && (
            <div className="space-y-2 mb-3">
              {(t.carbs_g ?? 0) > 0 && (
                <NutrientBar label="Carbs vs meal target" value={t.carbs_g} target={80} unit="g" />
              )}
              {(t.sodium_mg ?? 0) > 0 && (
                <NutrientBar label="Sodium vs meal limit" value={t.sodium_mg} target={600} unit="mg" />
              )}
              {(t.fiber_g ?? 0) > 0 && (
                <NutrientBar label="Fibre" value={t.fiber_g!} target={8} unit="g" />
              )}
            </div>
          )}

          {/* Traffic light object breakdown */}
          {meal.traffic_light && typeof meal.traffic_light === "object" && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(meal.traffic_light as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 bg-gl-stone-50 border border-gl-stone-100 rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] text-gl-stone-500 capitalize">{k}</span>
                  <span className={`w-2 h-2 rounded-full ml-1 ${
                    v === "green" ? "bg-gl-green" : v === "red" ? "bg-gl-red" : "bg-gl-amber"
                  }`} />
                </div>
              ))}
            </div>
          )}

          {/* Ingredient breakdown */}
          {meal.meal_items && meal.meal_items.length > 0 && (
            <div className="mb-3" onClick={e => e.stopPropagation()}>
              <IngredientBreakdown items={meal.meal_items as MealItemDetail[]} />
            </div>
          )}

          {/* Swap suggestions */}
          {meal.swap_suggestions && meal.swap_suggestions.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-medium text-gl-stone-400 uppercase tracking-wide mb-1.5">Suggestions</p>
              <ul className="space-y-1">
                {meal.swap_suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-gl-stone-600 flex gap-1.5">
                    <span className="text-brand-400 shrink-0">•</span>
                    {typeof s === "string" ? s : `${s.original} → ${s.swap}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* E) Agent attribution */}
          <div className="border-t border-gl-stone-100 pt-2.5 mt-2 flex items-center justify-between">
            <AgentTag label="Nutrition analysis" agent={2} />
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {confirmDelete && !deleting && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gl-stone-400 hover:text-gl-stone-600"
                >
                  Cancel
                </button>
              )}
              {deleting ? (
                <Spinner />
              ) : (
                <button
                  onClick={handleDelete}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                    confirmDelete
                      ? "bg-red-500 text-white"
                      : "text-red-400 border border-red-100 hover:bg-red-50"
                  }`}
                >
                  {confirmDelete ? "Confirm" : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MealHistory() {
  const { user } = useAuth()
  const { meals: rawMeals, loading } = useRecentMeals(user?.uid ?? "", 50)
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<RiskFilter>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const meals = useMemo(
    () => rawMeals.filter((m) => !deleted.has(m.meal_id)),
    [rawMeals, deleted]
  )

  const filtered = useMemo(() => {
    if (activeFilter === "all") return meals
    return meals.filter((m) => mealRiskLevel(m) === activeFilter)
  }, [meals, activeFilter])

  const groups = useMemo(() => groupByDate(filtered), [filtered])

  const handleDelete = (id: string) => {
    setDeleted((prev) => new Set([...prev, id]))
    setExpandedId(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-gl-ink mb-4">Meal History</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gl-ink">Meal History</h2>
        <span className="text-[10px] text-gl-stone-400 uppercase tracking-wide">
          {meals.length} meals · 7 days
        </span>
      </div>

      {/* A) Weekly summary strip */}
      {meals.length > 0 && <WeeklySummaryStrip meals={meals} />}

      {/* B) Risk filter chips */}
      {meals.length > 0 && (
        <FilterChips active={activeFilter} onChange={(v) => { setActiveFilter(v); setExpandedId(null) }} />
      )}

      {/* Empty states */}
      {meals.length === 0 && (
        <p className="text-sm text-gl-stone-400 text-center py-8">
          No meals logged yet — upload your first meal above!
        </p>
      )}
      {meals.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gl-stone-400 text-center py-6">
          No {activeFilter} risk meals in your history.
        </p>
      )}

      {/* C+D+E) Date-grouped expandable meal cards */}
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gl-stone-400 mb-2 px-0.5">
            {group.label}
          </p>
          {group.meals.map((meal) => (
            <ExpandableMealCard
              key={meal.meal_id}
              meal={meal}
              isExpanded={expandedId === meal.meal_id}
              onToggle={toggleExpand}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ))}
    </Card>
  )
}
