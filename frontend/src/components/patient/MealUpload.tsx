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

type UploadResult = {
  meal_items: MealItemDetail[]
  nutrition_totals: {
    calories_kcal: number
    carbs_g: number
    protein_g: number
    fat_g: number
    sodium_mg: number
    glycemic_load: number
    fiber_g: number
  }
  traffic_light: Record<string, string>
  risk_score: number
  recommendations: string[]
  drug_interactions: Array<{ food: string; medication: string; severity: string; note: string }>
}

const NUTRIENT_KEYS = ["carbs", "gl", "sodium", "protein"] as const
const NUTRIENT_LABELS: Record<string, string> = {
  carbs: "Carbs", gl: "Glycemic Load", sodium: "Sodium", protein: "Protein",
}

const MEAL_TYPES: { value: MealType; label: string; icon: string; hours: [number, number] }[] = [
  { value: "breakfast", label: "Breakfast", icon: "🌅", hours: [5, 11] },
  { value: "lunch",     label: "Lunch",     icon: "🌞", hours: [11, 15] },
  { value: "dinner",    label: "Dinner",    icon: "🌆", hours: [15, 22] },
  { value: "snack",     label: "Snack",     icon: "🍎", hours: [0, 24] },
]

function suggestMealType(): MealType {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return "breakfast"
  if (h >= 11 && h < 15) return "lunch"
  if (h >= 15 && h < 22) return "dinner"
  return "snack"
}

const MOTIVATIONAL: Record<string, string[]> = {
  low:      ["Great choice! Keep it up! 🎉", "Well balanced meal — your body thanks you!", "Excellent logging — you're on track! ✅"],
  moderate: ["Good job logging! Small swaps can help further. 💪", "You're tracking well — check the swaps above! 🔄"],
  high:     ["Thanks for logging — awareness is the first step! 📊", "Every log counts — review the suggestions to improve. 💡"],
}

function pickMotivation(riskScore: number): string {
  const key = riskScore >= 70 ? "high" : riskScore >= 40 ? "moderate" : "low"
  const pool = MOTIVATIONAL[key]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function MealUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>(suggestMealType())
  const [motivation, setMotivation] = useState("")

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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
        resolve(dataUrl.split(",")[1])
      }
      img.onerror = reject
      img.src = url
    })

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, HEIC).")
      return
    }

    // Store preview before compression (separate object URL, kept alive until reset)
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const base64 = await compressImage(file)
      try {
        const { data } = await api.uploadMeal(base64, mealType)
        if (data.success) {
          setResult(data)
          setMotivation(pickMotivation(data.risk_score ?? 0))
        } else {
          setError(data.errors?.[0]?.error ?? "Analysis failed — try a clearer photo.")
        }
      } catch (err: any) {
        const detail = err?.response?.data?.detail ?? err?.response?.data?.error ?? err?.message ?? "Unknown error"
        setError(`Upload failed: ${detail}`)
      } finally {
        setLoading(false)
      }
    } catch {
      setError("Could not read image file.")
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setResult(null)
    setError("")
    setMotivation("")
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    if (inputRef.current) inputRef.current.value = ""
    setMealType(suggestMealType())
  }

  const totals = result?.nutrition_totals

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Analyse Meal</h2>

      {/* Drop zone — shown when no result yet */}
      {!result && !loading && (
        <>
          {/* Meal type selector */}
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

          {/* Preview of selected image (while uploading, before result) */}
          {previewUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Uploaded meal" className="w-full max-h-56 object-cover" />
            </div>
          )}
          {!previewUrl && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
            >
              <span className="text-3xl mb-2">📷</span>
              <p className="text-sm text-slate-500 font-medium">Drop a photo or tap to upload</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC accepted</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </>
      )}

      {loading && (
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-5">
          {/* Uploaded image — full-width, aspect-ratio constrained */}
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={previewUrl}
                alt="Uploaded meal"
                className="w-full object-contain max-h-72"
                style={{ aspectRatio: "auto" }}
              />
            </div>
          )}

          {/* Motivational note */}
          {motivation && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5 flex items-center gap-2">
              <span className="text-base shrink-0">🌟</span>
              <p className="text-sm text-brand-700 font-medium">{motivation}</p>
            </div>
          )}

          {/* Meal type + overall risk */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">
              {MEAL_TYPES.find((m) => m.value === mealType)?.icon} {mealType}
            </span>
            <span className="text-sm font-medium text-slate-600">Risk:</span>
            <Badge label={riskLabel(result.risk_score)} className={riskColor(result.risk_score)} />
          </div>

          {/* Nutrient traffic lights */}
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

          {/* Nutrition totals — 6 cards */}
          {totals && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Meal Totals</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Calories",  value: formatKcal(totals.calories_kcal) },
                  { label: "Carbs",     value: formatGrams(totals.carbs_g) },
                  { label: "Protein",   value: formatGrams(totals.protein_g) },
                  { label: "Fat",       value: formatGrams(totals.fat_g) },
                  { label: "Sodium",    value: `${Math.round(totals.sodium_mg ?? 0)}mg` },
                  { label: "Glyc. Load",value: String((totals.glycemic_load ?? 0).toFixed(1)) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-2.5 text-center">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredient breakdown */}
          <IngredientBreakdown items={result.meal_items} />

          <RecommendationsList recommendations={result.recommendations} />
          <DrugInteractionsCard interactions={result.drug_interactions} />

          <Button variant="secondary" onClick={reset} className="w-full">
            Upload Another
          </Button>
        </div>
      )}
    </Card>
  )
}
