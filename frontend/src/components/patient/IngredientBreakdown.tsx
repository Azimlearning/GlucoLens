import { useState } from "react"

const GI_TOOLTIP = "Glycemic Index (GI): How fast this food raises blood sugar. Low <55 · Medium 55–70 · High >70. Lower is better for T2D."
const GL_TOOLTIP = "Glycemic Load (GL): GI × carbs in your actual portion ÷ 100. More meaningful than GI alone. Low <10 · Medium 10–20 · High >20."

interface NutritionPer100g {
  calories_kcal: number
  carbs_g: number
  protein_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
}

export interface MealItemDetail {
  name: string
  portion_g: number
  nutrition_per_100g: NutritionPer100g
  gi: number
  gl: number
  components: string[]
  confidence: number
  allergens_triggered: string[]
  category?: string
}

interface Props {
  items: MealItemDetail[]
}

const MACRO_BARS = [
  { key: "carbs_g",   label: "Carbs",   color: "bg-amber-400"   },
  { key: "protein_g", label: "Protein", color: "bg-sky-400"     },
  { key: "fat_g",     label: "Fat",     color: "bg-rose-400"    },
  { key: "fiber_g",   label: "Fibre",   color: "bg-emerald-400" },
] as const

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block ml-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-xs font-bold leading-4 text-center hover:bg-slate-300 transition-colors"
        aria-label="Info"
      >i</button>
      {open && (
        <span className="absolute left-0 top-5 z-10 w-64 rounded-xl bg-slate-800 text-white text-xs p-2.5 shadow-lg leading-relaxed">
          {text}
          <button onClick={() => setOpen(false)} className="ml-2 underline opacity-70">close</button>
        </span>
      )}
    </span>
  )
}

function ItemCard({ item }: { item: MealItemDetail }) {
  const p = item.portion_g || 100
  const n = item.nutrition_per_100g || ({} as NutritionPer100g)
  const ratio = p / 100
  const portionCal   = Math.round((n.calories_kcal || 0) * ratio)
  const portionCarbs = Math.round((n.carbs_g  || 0) * ratio)
  const portionProt  = Math.round((n.protein_g || 0) * ratio)
  const portionFat   = Math.round((n.fat_g    || 0) * ratio)
  const portionFibre = Math.round((n.fiber_g  || 0) * ratio)
  const portionSod   = Math.round((n.sodium_mg || 0) * ratio)
  const totalMacroG  = portionCarbs + portionProt + portionFat + portionFibre || 1

  const confidence = Math.round((item.confidence || 0) * 100)
  const confColor = confidence >= 70
    ? "text-emerald-600 bg-emerald-50"
    : confidence >= 40
      ? "text-amber-600 bg-amber-50"
      : "text-slate-500 bg-slate-100"

  const macroValues: Record<string, number> = {
    carbs_g: portionCarbs, protein_g: portionProt,
    fat_g: portionFat, fiber_g: portionFibre,
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 capitalize">{item.name}</p>
          <p className="text-xs text-slate-400 flex items-center flex-wrap gap-x-1">
            {Math.round(p)}g · {portionCal} kcal ·{" "}
            <span>GI {item.gi ?? "—"}<InfoTip text={GI_TOOLTIP} /></span>
            {" "}·{" "}
            <span>GL {item.gl?.toFixed(1) ?? "—"}<InfoTip text={GL_TOOLTIP} /></span>
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${confColor}`}>
          {confidence}% match
        </span>
      </div>

      {/* Components */}
      {item.components && item.components.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Contains</p>
          <div className="flex flex-wrap gap-1.5">
            {item.components.map((comp, ci) => (
              <span key={ci} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergen warning */}
      {item.allergens_triggered && item.allergens_triggered.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-red-700 font-medium">
            Allergen alert: {item.allergens_triggered.join(", ")}
          </p>
        </div>
      )}

      {/* Macro bars */}
      <div className="space-y-1.5">
        {MACRO_BARS.map(({ key, label, color }) => {
          const val = macroValues[key]
          const width = Math.min(100, Math.round((val / totalMacroG) * 100))
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-10 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
              </div>
              <span className="text-xs text-slate-600 w-8 text-right shrink-0">{val}g</span>
            </div>
          )
        })}
      </div>

      {/* Sodium */}
      <p className="text-xs text-slate-400">Sodium: {portionSod}mg</p>
    </div>
  )
}

export function IngredientBreakdown({ items }: Props) {
  const [index, setIndex] = useState(0)

  if (!items || items.length === 0) return null

  const current = items[index]
  const total = items.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Ingredient Breakdown</p>
        {total > 1 && (
          <span className="text-xs text-slate-400">{index + 1} / {total}</span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <ItemCard item={current} />
      </div>

      {/* Carousel navigation */}
      {total > 1 && (
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            ← Prev
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === index ? "bg-brand-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
