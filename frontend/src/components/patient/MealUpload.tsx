import { useRef, useState } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { Badge } from "@/components/shared/Badge"
import { TrafficLightBadge } from "@/components/shared/TrafficLight"
import { AgentStatusTicker } from "./AgentStatusTicker"
import { RecommendationsList } from "./RecommendationsList"
import { DrugInteractionsCard } from "./DrugInteractionsCard"
import { IngredientBreakdown } from "./IngredientBreakdown"
import type { MealItemDetail } from "./IngredientBreakdown"
import { riskLabel, riskColor, formatKcal, formatGrams } from "@/lib/format"
import type { MealType } from "@/lib/types"

type NutritionTotals = {
  calories_kcal: number
  carbs_g: number
  protein_g: number
  fat_g: number
  sodium_mg: number
  glycemic_load: number
  fiber_g?: number
}

type UploadResult = {
  meal_items: MealItemDetail[]
  nutrition_totals: NutritionTotals
  traffic_light: Record<string, string>
  risk_score: number
  recommendations: string[]
  drug_interactions: Array<{ food: string; medication: string; severity: string; note: string }>
}

type Step = "idle" | "analyzing" | "deciding" | "adjusting" | "saving" | "done"

const NUTRIENT_KEYS = ["carbs", "gl", "sodium", "protein"] as const
const NUTRIENT_LABELS: Record<string, string> = {
  carbs: "Carbs", gl: "Glycemic Load", sodium: "Sodium", protein: "Protein",
}

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: "breakfast", label: "Breakfast", icon: "🌅" },
  { value: "lunch",     label: "Lunch",     icon: "🌞" },
  { value: "dinner",    label: "Dinner",    icon: "🌆" },
  { value: "snack",     label: "Snack",     icon: "🍎" },
]

const PORTIONS = [
  { label: "Full",        pct: 100 },
  { label: "¾ Portion",  pct: 75  },
  { label: "½ Portion",  pct: 50  },
] as const

const MOTIVATIONAL: Record<string, string[]> = {
  low:      ["Great choice! Keep it up!", "Well balanced meal — your body thanks you!", "Excellent logging — you're on track!"],
  moderate: ["Good job logging! Small swaps can help further.", "You're tracking well — check the swaps above!"],
  high:     ["Thanks for logging — awareness is the first step!", "Every log counts — review the suggestions to improve."],
}

function suggestMealType(): MealType {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return "breakfast"
  if (h >= 11 && h < 15) return "lunch"
  if (h >= 15 && h < 22) return "dinner"
  return "snack"
}

function pickMotivation(riskScore: number): string {
  const key = riskScore >= 70 ? "high" : riskScore >= 40 ? "moderate" : "low"
  const pool = MOTIVATIONAL[key]
  return pool[Math.floor(Math.random() * pool.length)]
}

function scaleTotals(t: NutritionTotals, pct: number): Record<string, number> {
  const f = pct / 100
  return {
    calories_kcal: t.calories_kcal * f,
    carbs_g:       t.carbs_g       * f,
    protein_g:     t.protein_g     * f,
    fat_g:         t.fat_g         * f,
    sodium_mg:     t.sodium_mg     * f,
    glycemic_load: t.glycemic_load * f,
    fiber_g:       (t.fiber_g ?? 0) * f,
  }
}

function NutrientGrid({ t, pct }: { t: Record<string, number>; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-600">Meal Totals</p>
        {pct < 100 && (
          <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded-full">
            {pct}% portion
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Calories",   value: formatKcal(t.calories_kcal) },
          { label: "Carbs",      value: formatGrams(t.carbs_g) },
          { label: "Protein",    value: formatGrams(t.protein_g) },
          { label: "Fat",        value: formatGrams(t.fat_g) },
          { label: "Sodium",     value: `${Math.round(t.sodium_mg ?? 0)}mg` },
          { label: "Glyc. Load", value: String((t.glycemic_load ?? 0).toFixed(1)) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-slate-50 p-2.5 text-center">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MealUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("idle")
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>(suggestMealType())
  const [motivation, setMotivation] = useState("")
  const [portionPct, setPortionPct] = useState(100)
  const [appliedSwaps, setAppliedSwaps] = useState<Set<number>>(new Set())

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1])
      }
      img.onerror = reject
      img.src = url
    })

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, HEIC).")
      return
    }
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setStep("analyzing")
    setError("")
    setResult(null)
    setPortionPct(100)
    setAppliedSwaps(new Set())

    try {
      const base64 = await compressImage(file)
      try {
        const { data } = await api.uploadMeal(base64, mealType)
        if (data.success) {
          setResult(data)
          setMotivation(pickMotivation(data.risk_score ?? 0))
          setStep("deciding")
        } else {
          setError(data.errors?.[0]?.error ?? "Analysis failed — try a clearer photo.")
          setStep("idle")
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string; error?: string } }; message?: string }
        const detail = e?.response?.data?.detail ?? e?.response?.data?.error ?? e?.message ?? "Unknown error"
        setError(`Upload failed: ${detail}`)
        setStep("idle")
      }
    } catch {
      setError("Could not read image file.")
      setStep("idle")
    }
  }

  const doConfirm = async (totals: Record<string, number>, swaps: string[]) => {
    if (!result) return
    setStep("saving")
    const mealName = result.meal_items
      .slice(0, 3)
      .map((it) => (it as { name?: string }).name)
      .filter(Boolean)
      .join(", ") || "Meal"
    try {
      await api.confirmMeal({
        meal_name:       mealName,
        meal_type:       mealType,
        nutrition_totals: totals,
        meal_items:      result.meal_items,
        traffic_light:   result.traffic_light,
        risk_score:      result.risk_score,
        recommendations: result.recommendations,
        drug_interactions: result.drug_interactions,
        applied_swaps:   swaps,
      })
      setStep("done")
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to save meal.")
      setStep("deciding")
    }
  }

  const handleProceed = () => {
    if (!result) return
    doConfirm(scaleTotals(result.nutrition_totals, 100), [])
  }

  const handleLogAdjusted = () => {
    if (!result) return
    const swaps = [...appliedSwaps].map((i) => result.recommendations[i]).filter(Boolean)
    doConfirm(scaleTotals(result.nutrition_totals, portionPct), swaps)
  }

  const toggleSwap = (i: number) => {
    setAppliedSwaps((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const reset = () => {
    setStep("idle")
    setResult(null)
    setError("")
    setMotivation("")
    setPortionPct(100)
    setAppliedSwaps(new Set())
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    if (inputRef.current) inputRef.current.value = ""
    setMealType(suggestMealType())
  }

  const adjustedTotals = result ? scaleTotals(result.nutrition_totals, portionPct) : null

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Analyse Meal</h2>

      {/* ---- IDLE: upload zone ---- */}
      {step === "idle" && (
        <>
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-2">Which meal is this?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setMealType(value)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 text-xs font-medium border transition-colors ${
                    mealType === value
                      ? "bg-brand-50 border-brand-400 text-brand-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
          >
            <span className="text-3xl mb-2">📷</span>
            <p className="text-sm text-slate-500 font-medium">Drop a photo or tap to upload</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC accepted</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </>
      )}

      {/* ---- ANALYZING ---- */}
      {step === "analyzing" && (
        <div className="py-4">
          {previewUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}
          <p className="text-sm font-medium text-slate-600 mb-4">Analysing your meal...</p>
          <AgentStatusTicker active={true} />
        </div>
      )}

      {/* ---- DECIDING / ADJUSTING / SAVING ---- */}
      {result && (step === "deciding" || step === "adjusting" || step === "saving") && (
        <div className="space-y-5">
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}

          {motivation && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5 flex items-center gap-2">
              <span className="text-base shrink-0">🌟</span>
              <p className="text-sm text-brand-700 font-medium">{motivation}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">
              {MEAL_TYPES.find((m) => m.value === mealType)?.icon} {mealType}
            </span>
            <span className="text-sm font-medium text-slate-600">Risk:</span>
            <Badge label={riskLabel(result.risk_score)} className={riskColor(result.risk_score)} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Nutrient Traffic Lights</p>
            <div className="grid grid-cols-2 gap-2">
              {NUTRIENT_KEYS.map((key) =>
                result.traffic_light[key] ? (
                  <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-500">{NUTRIENT_LABELS[key]}</span>
                    <TrafficLightBadge value={result.traffic_light[key] as "green" | "amber" | "red"} />
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Live-updating nutrition totals */}
          {adjustedTotals && <NutrientGrid t={adjustedTotals} pct={portionPct} />}

          <IngredientBreakdown items={result.meal_items} />
          <RecommendationsList recommendations={result.recommendations} />
          <DrugInteractionsCard interactions={result.drug_interactions} />

          {/* ---- Adjustment panel (portion + swap toggles) ---- */}
          {(step === "adjusting" || step === "saving") && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-amber-800">Adjust Your Meal</p>

              <div>
                <p className="text-xs text-amber-700 mb-2">How much are you eating?</p>
                <div className="grid grid-cols-3 gap-2">
                  {PORTIONS.map(({ label, pct }) => (
                    <button
                      key={pct}
                      onClick={() => setPortionPct(pct)}
                      className={`rounded-xl py-2 text-xs font-medium border transition-colors ${
                        portionPct === pct
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-amber-200 text-amber-700 hover:border-amber-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {result.recommendations.length > 0 && (
                <div>
                  <p className="text-xs text-amber-700 mb-2">Which swaps did you apply?</p>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSwap(i)}
                        className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-colors flex items-start gap-2 ${
                          appliedSwaps.has(i)
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : "bg-white border-amber-200 text-amber-800 hover:border-amber-400"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{appliedSwaps.has(i) ? "✅" : "○"}</span>
                        <span>{rec}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleLogAdjusted} disabled={step === "saving"} className="w-full">
                {step === "saving" ? "Saving…" : "Log Adjusted Meal"}
              </Button>
              {step !== "saving" && (
                <button
                  onClick={() => setStep("deciding")}
                  className="w-full text-xs text-amber-600 underline text-center"
                >
                  Back
                </button>
              )}
            </div>
          )}

          {/* ---- Decision buttons ---- */}
          {step === "deciding" && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center font-medium pt-2">What would you like to do?</p>
              <Button onClick={handleProceed} className="w-full">
                Log This Meal
              </Button>
              <Button variant="secondary" onClick={() => setStep("adjusting")} className="w-full">
                Adjust Meal
              </Button>
              <button
                onClick={reset}
                className="w-full rounded-xl py-2 px-4 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
              >
                Cancel — Not Eating This
              </button>
            </div>
          )}

          {step === "saving" && (
            <p className="text-center text-sm text-slate-500 py-2">Saving your meal…</p>
          )}
        </div>
      )}

      {/* ---- DONE ---- */}
      {step === "done" && (
        <div className="space-y-5">
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-6 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-base font-semibold text-emerald-800">Meal logged!</p>
            <p className="text-xs text-emerald-600">
              Your meal has been saved. Scroll down to see your updated history and charts.
            </p>
          </div>
          <Button variant="secondary" onClick={reset} className="w-full">
            Upload Another
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  )
}
