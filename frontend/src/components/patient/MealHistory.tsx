import { useState } from "react"
import { Card } from "@/components/shared/Card"
import { TrafficLightBadge, TrafficLightDot } from "@/components/shared/TrafficLight"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentMeals } from "@/hooks/usePatientData"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import type { MealRecord } from "@/lib/types"
import { IngredientBreakdown } from "./IngredientBreakdown"
import type { MealItemDetail } from "./IngredientBreakdown"

const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: "🌅", lunch: "🌞", dinner: "🌆", snack: "🍎", unspecified: "🍽️",
}

function riskBadge(score?: number) {
  if (score === undefined || score === null) return null
  const [label, cls] = score >= 70
    ? ["High Risk", "bg-red-100 text-red-700"]
    : score >= 40
      ? ["Moderate", "bg-amber-100 text-amber-700"]
      : ["Low Risk", "bg-emerald-100 text-emerald-700"]
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function NutritionGrid({ totals }: { totals: NonNullable<MealRecord["nutrition_totals"]> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-3">
      {[
        { label: "Calories", value: `${Math.round(totals.calories_kcal ?? 0)} kcal` },
        { label: "Carbs",    value: `${Math.round(totals.carbs_g ?? 0)}g` },
        { label: "Protein",  value: `${Math.round(totals.protein_g ?? 0)}g` },
        { label: "Fat",      value: `${Math.round(totals.fat_g ?? 0)}g` },
        { label: "Sodium",   value: `${Math.round(totals.sodium_mg ?? 0)}mg` },
        { label: "GL",       value: (totals.glycemic_load ?? 0).toFixed(1) },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-white p-2 text-center border border-slate-100">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  )
}

function MealDetailPanel({
  meal, onDelete,
}: {
  meal: MealRecord
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
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

  const trafficLight = typeof meal.traffic_light === "string"
    ? (meal.traffic_light as "green" | "amber" | "red")
    : "green"

  return (
    <div className="space-y-3">
      {/* Traffic lights */}
      {meal.traffic_light && typeof meal.traffic_light === "object" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(meal.traffic_light as Record<string, string>).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5">
              <span className="text-xs text-slate-500 capitalize">{k}</span>
              <TrafficLightBadge value={v as "green" | "amber" | "red"} />
            </div>
          ))}
        </div>
      )}

      {/* Single traffic light (seeded data) */}
      {typeof meal.traffic_light === "string" && (
        <div className="flex items-center gap-2">
          <TrafficLightDot value={trafficLight} />
          <TrafficLightBadge value={trafficLight} />
        </div>
      )}

      {/* Nutrition totals — prefer structured object, fall back to top-level fields */}
      {meal.nutrition_totals
        ? <NutritionGrid totals={meal.nutrition_totals} />
        : (meal.calories || meal.carbs_g) && (
          <NutritionGrid totals={{
            calories_kcal: meal.calories ?? 0,
            carbs_g:        meal.carbs_g  ?? 0,
            protein_g:      0,
            fat_g:          0,
            sodium_mg:      0,
            glycemic_load:  0,
          }} />
        )
      }

      {/* Ingredient breakdown carousel */}
      {meal.meal_items && meal.meal_items.length > 0 && (
        <IngredientBreakdown items={meal.meal_items as MealItemDetail[]} />
      )}

      {/* Recommendations */}
      {meal.swap_suggestions && meal.swap_suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Suggestions</p>
          <ul className="space-y-1">
            {meal.swap_suggestions.map((s, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                <span className="text-brand-400 shrink-0">•</span>
                {typeof s === "string" ? s : `${s.original} → ${s.swap}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete */}
      <div className="flex justify-end items-center gap-2 pt-1">
        {deleting ? (
          <Spinner />
        ) : (
          <>
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleDelete}
              className={`text-xs font-medium px-3 py-1.5 rounded-xl transition-colors ${
                confirmDelete
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "text-red-500 border border-red-200 hover:bg-red-50"
              }`}
            >
              {confirmDelete ? "Confirm Delete" : "Delete Meal"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function MealHistory() {
  const { user } = useAuth()
  const { meals: rawMeals, loading } = useRecentMeals(user?.uid ?? "", 20)
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [activeIndex, setActiveIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const meals = rawMeals.filter((m) => !deleted.has(m.meal_id))

  const handleDelete = (id: string) => {
    setDeleted((prev) => new Set([...prev, id]))
    setExpanded(false)
    setActiveIndex((i) => Math.min(i, Math.max(0, meals.length - 2)))
  }

  if (loading) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Meals</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }

  if (meals.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Meals</h2>
        <p className="text-sm text-slate-400 text-center py-8">
          No meals logged yet — upload your first meal above!
        </p>
      </Card>
    )
  }

  const current = meals[activeIndex]
  const total = meals.length
  const riskScore = current.meal_risk_score ?? current.risk_score
  const mealTypeIcon = MEAL_TYPE_ICONS[(current.meal_type as string) ?? "unspecified"] ?? "🍽️"
  const trafficLight = typeof current.traffic_light === "string"
    ? (current.traffic_light as "green" | "amber" | "red")
    : "green"

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Recent Meals</h2>
        <span className="text-xs text-slate-400">{activeIndex + 1} / {total}</span>
      </div>

      {/* Carousel card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <TrafficLightDot value={trafficLight} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{mealTypeIcon}</span>
                <p className="text-sm font-semibold text-slate-800 truncate">{current.name}</p>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(current.timestamp).toLocaleDateString("en-MY", {
                  weekday: "short", month: "short", day: "numeric",
                })} · {current.calories ?? Math.round(current.nutrition_totals?.calories_kcal ?? 0)} kcal
                {current.carbs_g ? ` · ${current.carbs_g}g carbs` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {riskBadge(riskScore)}
            <span className="text-slate-300 text-xs">{expanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-slate-200 px-4 pb-4 pt-3 bg-white">
            <MealDetailPanel meal={current} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {/* Carousel navigation */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <button
          onClick={() => { setActiveIndex((i) => Math.max(0, i - 1)); setExpanded(false) }}
          disabled={activeIndex === 0}
          className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
        >
          ← Newer
        </button>

        {/* Dot indicators — show up to 7 */}
        <div className="flex gap-1 overflow-hidden">
          {meals.slice(0, 7).map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setExpanded(false) }}
              className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
                i === activeIndex ? "bg-brand-500" : "bg-slate-200"
              }`}
            />
          ))}
          {meals.length > 7 && <span className="text-xs text-slate-300 ml-1">+{meals.length - 7}</span>}
        </div>

        <button
          onClick={() => { setActiveIndex((i) => Math.min(total - 1, i + 1)); setExpanded(false) }}
          disabled={activeIndex === total - 1}
          className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
        >
          Older →
        </button>
      </div>
    </Card>
  )
}
