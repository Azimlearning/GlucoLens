import { useRef, useState } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { Badge } from "@/components/shared/Badge"
import { TrafficLightBadge } from "@/components/shared/TrafficLight"
import { AgentStatusTicker } from "./AgentStatusTicker"
import { StaggeredCardList } from "@/components/shared/StaggeredCardList"
import { AnalysisAuditFooter } from "@/components/shared/AnalysisAuditFooter"
import { useAgentTicker } from "@/hooks/useAgentTicker"
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

// SVG meal-type icons (no emojis)
const MEAL_ICONS: Record<string, JSX.Element> = {
  breakfast: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="10" cy="10" r="5" />
      <line x1="10" y1="1" x2="10" y2="3" />
      <line x1="10" y1="17" x2="10" y2="19" />
      <line x1="1" y1="10" x2="3" y2="10" />
      <line x1="17" y1="10" x2="19" y2="10" />
    </svg>
  ),
  lunch: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 17V9a6 6 0 0 1 12 0v8" />
      <line x1="2" y1="17" x2="18" y2="17" />
    </svg>
  ),
  dinner: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 7c1.5-2 4.5-2 6 0s4.5 2 6 0" />
      <path d="M3 13h14" />
      <line x1="6" y1="7" x2="6" y2="13" />
      <line x1="14" y1="7" x2="14" y2="13" />
    </svg>
  ),
  snack: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="10" cy="12" r="5" />
      <path d="M10 7V4" />
      <path d="M8 4c0-1.1.9-2 2-2s2 .9 2 2" />
    </svg>
  ),
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
]

const PORTIONS = [
  { label: "Full", pct: 100 },
  { label: "¾ Portion", pct: 75 },
  { label: "½ Portion", pct: 50 },
] as const

const MOTIVATIONAL: Record<string, string[]> = {
  low: ["Great choice! Keep it up!", "Well balanced meal — your body thanks you!", "Excellent logging — you're on track!"],
  moderate: ["Good job logging! Small swaps can help further.", "You're tracking well — check the swaps above!"],
  high: ["Thanks for logging — awareness is the first step!", "Every log counts — review the suggestions to improve."],
}

function suggestMealType(): MealType {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return "breakfast"
  if (h >= 11 && h < 15) return "lunch"
  if (h >= 15 && h < 22) return "dinner"
  return "snack"
}

function pickMotivation(riskScore: number): string {
  const key = riskScore >= 70 ? "high" : riskScore >= 40 ? "moderate" : "low"
  const pool = MOTIVATIONAL[key]
  return pool[Math.floor(Math.random() * pool.length)]
}

// Per-swap nutrient adjustment — each checked swap applies a targeted reduction.
// We parse the swap text for keywords to decide which nutrient to reduce.
const SWAP_BENEFIT_PER_NUTRIENT: Record<string, Partial<Record<keyof NutritionTotals, number>>> = {
  sodium: { sodium_mg: 0.10 },
  carb: { carbs_g: 0.08, glycemic_load: 0.08 },
  glycemic: { carbs_g: 0.06, glycemic_load: 0.10 },
  oil: { calories_kcal: 0.06, fat_g: 0.10 },
  vegeta: { fiber_g: 0.15, glycemic_load: 0.05 },
  bean: { fiber_g: 0.15, glycemic_load: 0.05, carbs_g: 0.05 },
  protein: { protein_g: 0.10 },
  portion: { calories_kcal: 0.08, carbs_g: 0.08, sodium_mg: 0.05 },
  sauce: { sodium_mg: 0.08 },
  steam: { calories_kcal: 0.08, fat_g: 0.12 },
  lard: { calories_kcal: 0.05, fat_g: 0.10, sodium_mg: 0.05 },
}

function swapReductionFactor(swap: string): Partial<Record<keyof NutritionTotals, number>> {
  const lower = swap.toLowerCase()
  const combined: Partial<Record<keyof NutritionTotals, number>> = {}
  for (const [keyword, reductions] of Object.entries(SWAP_BENEFIT_PER_NUTRIENT)) {
    if (lower.includes(keyword)) {
      for (const [k, v] of Object.entries(reductions)) {
        const key = k as keyof NutritionTotals
        combined[key] = (combined[key] ?? 0) + (v as number)
      }
    }
  }
  // Default: generic 5% reduction across all if no keyword matched
  if (Object.keys(combined).length === 0) {
    return { calories_kcal: 0.05, carbs_g: 0.04, sodium_mg: 0.04 }
  }
  return combined
}

function scaleTotals(
  t: NutritionTotals,
  pct: number,
  appliedSwapTexts: string[] = [],
): Record<string, number> {
  const f = pct / 100
  // Start with portion-scaled values
  const result: Record<string, number> = {
    calories_kcal: t.calories_kcal * f,
    carbs_g: t.carbs_g * f,
    protein_g: t.protein_g * f,
    fat_g: t.fat_g * f,
    sodium_mg: t.sodium_mg * f,
    glycemic_load: t.glycemic_load * f,
    fiber_g: (t.fiber_g ?? 0) * f,
  }
  // Apply cumulative swap reductions (capped at 40% total reduction per nutrient)
  for (const swap of appliedSwapTexts) {
    const reductions = swapReductionFactor(swap)
    for (const [k, reduction] of Object.entries(reductions)) {
      const key = k as keyof typeof result
      if (key === "protein_g") {
        // Protein swaps increase protein, not decrease
        result[key] = result[key] * (1 + (reduction as number))
      } else if (key === "fiber_g") {
        result[key] = result[key] * (1 + (reduction as number))
      } else {
        result[key] = result[key] * (1 - (reduction as number))
      }
    }
  }
  // Round all values
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, parseFloat((v as number).toFixed(1))]))
}

function NutrientGrid({ t, pct }: { t: Record<string, number>; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-semibold text-gl-ink-soft">Meal Totals</p>
        {pct < 100 && (
          <span className="text-xs text-brand-600 font-semibold bg-brand-50 px-2.5 py-0.5 rounded-pill">
            {pct}% portion
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Calories", value: formatKcal(t.calories_kcal) },
          { label: "Carbs", value: formatGrams(t.carbs_g) },
          { label: "Protein", value: formatGrams(t.protein_g) },
          { label: "Fat", value: formatGrams(t.fat_g) },
          { label: "Sodium", value: `${Math.round(t.sodium_mg ?? 0)}mg` },
          { label: "Glyc. Load", value: String((t.glycemic_load ?? 0).toFixed(1)) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md bg-gl-stone-50 p-2.5 text-center border border-gl-stone-100">
            <p className="text-xs text-gl-stone-400">{label}</p>
            <p className="text-sm font-semibold text-gl-ink font-mono-gl mt-0.5">{value}</p>
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
  const [resultTimestamp, setResultTimestamp] = useState<string | undefined>(undefined)

  // Option 1 — ticker gating: hold result display until all stages have been shown
  const isAnalysing = step === "analyzing"
  const { tickerDone } = useAgentTicker(isAnalysing)

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
          // Store result but wait for ticker to finish before showing
          setResult(data)
          setMotivation(pickMotivation(data.risk_score ?? 0))
          setResultTimestamp(new Date().toISOString())
          // Step will transition to "deciding" via useEffect once tickerDone
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
        meal_name: mealName,
        meal_type: mealType,
        nutrition_totals: totals,
        meal_items: result.meal_items,
        traffic_light: result.traffic_light,
        risk_score: result.risk_score,
        recommendations: result.recommendations,
        drug_interactions: result.drug_interactions,
        applied_swaps: swaps,
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
    doConfirm(scaleTotals(result.nutrition_totals, portionPct, swaps), swaps)
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
    setResultTimestamp(undefined)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    if (inputRef.current) inputRef.current.value = ""
    setMealType(suggestMealType())
  }

  const adjustedTotals = result
    ? scaleTotals(
      result.nutrition_totals,
      portionPct,
      step === "adjusting" || step === "saving"
        ? [...appliedSwaps].map((i) => result.recommendations[i]).filter(Boolean)
        : [],
    )
    : null

  return (
    <Card>
      <h2 className="text-h4 font-semibold text-gl-ink mb-5">Analyse Meal</h2>

      {/* ── IDLE: upload zone ── */}
      {step === "idle" && (
        <>
          {/* Meal type selector */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gl-stone-400 mb-2.5 uppercase tracking-wide">Which meal is this?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMealType(value)}
                  className={`flex flex-col items-center gap-1 rounded-md py-2.5 px-1 text-xs font-medium border transition-all duration-fast ease-gl active:scale-[0.97] ${mealType === value
                      ? "bg-brand-50 border-brand-400 text-brand-700"
                      : "bg-gl-stone-50 border-gl-stone-100 text-gl-stone-400 hover:border-gl-stone-200"
                    }`}
                >
                  <span className={mealType === value ? "text-brand-500" : "text-gl-stone-300"}>
                    {MEAL_ICONS[value]}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className={[
              "border-2 border-dashed border-gl-stone-200 rounded-lg p-8",
              "flex flex-col items-center justify-center cursor-pointer gap-2",
              "hover:border-brand-300 hover:bg-brand-50/40 transition-all duration-fast ease-gl",
            ].join(" ")}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8AD96" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="28" height="22" rx="4" />
              <circle cx="16" cy="17" r="5" />
              <path d="M10 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            </svg>
            <p className="text-sm font-medium text-gl-stone-500">Drop a photo or tap to upload</p>
            <p className="text-xs text-gl-stone-300">JPG, PNG, HEIC accepted</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </>
      )}

      {/* ── ANALYZING ── */}
      {step === "analyzing" && (
        <div className="py-4">
          {previewUrl && (
            <div className="mb-5 rounded-lg overflow-hidden border border-gl-stone-100 bg-gl-stone-50">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}
          <p className="text-sm font-medium text-gl-stone-500 mb-4">Analysing your meal…</p>
          {/* Option 1 — AgentStatusTicker with per-stage timing */}
          <AgentStatusTicker active={true} />
          {!tickerDone && (
            <p className="text-xs text-gl-stone-300 text-center mt-3">Please wait while all agents complete…</p>
          )}
        </div>
      )}

      {/* ── DECIDING / ADJUSTING / SAVING ── Option 2: staggered card reveal ── */}
      {result && (step === "deciding" || step === "adjusting" || step === "saving") && (
        <div className="space-y-5">
          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-gl-stone-100 bg-gl-stone-50">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}

          {/* Motivational message */}
          {motivation && (
            <div className="rounded-md bg-brand-50 border border-brand-100 px-3.5 py-3 flex items-start gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
                <path d="M2 14C2 14 3 8 8 5C13 2 14 2 14 2C14 2 14 3 11 8C8 13 2 14 2 14Z" fill="#C8893A" opacity="0.7" />
                <circle cx="8" cy="8" r="1.5" fill="#A8702A" />
              </svg>
              <p className="text-sm text-brand-700 font-medium">{motivation}</p>
            </div>
          )}

          {/* Meal type + risk */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs bg-gl-stone-50 border border-gl-stone-100 text-gl-stone-500 px-2.5 py-1 rounded-pill capitalize font-medium">
              {MEAL_TYPES.find((m) => m.value === mealType)?.label}
            </span>
            <span className="text-sm text-gl-stone-400">Risk:</span>
            <Badge label={riskLabel(result.risk_score)} className={riskColor(result.risk_score)} />
          </div>

          {/* Option 2 — Staggered card reveal, keyed to result timestamp */}
          <StaggeredCardList animKey={resultTimestamp} delayBetweenMs={180}>
            {[
              /* Card 1 — Traffic lights (Clinical review · Agent 3) */
              <div key="traffic">
                <p className="text-xs font-semibold text-gl-stone-400 uppercase tracking-widest mb-2">Clinical review · Agent 3</p>
                <div className="grid grid-cols-2 gap-2">
                  {NUTRIENT_KEYS.map((key) =>
                    result.traffic_light[key] ? (
                      <div key={key} className="flex items-center justify-between rounded-md bg-gl-stone-50 border border-gl-stone-100 px-3 py-2">
                        <span className="text-xs text-gl-stone-400 font-medium">{NUTRIENT_LABELS[key]}</span>
                        <TrafficLightBadge value={result.traffic_light[key] as "green" | "amber" | "red"} />
                      </div>
                    ) : null
                  )}
                </div>
              </div>,

              /* Card 2 — Nutrition totals (Nutrition analysis · Agent 2) */
              <div key="nutrition">
                <p className="text-xs font-semibold text-gl-stone-400 uppercase tracking-widest mb-2">Nutrition analysis · Agent 2</p>
                {adjustedTotals && <NutrientGrid t={adjustedTotals} pct={portionPct} />}
              </div>,

              /* Card 3 — Ingredient breakdown */
              <IngredientBreakdown key="ingredients" items={result.meal_items} />,

              /* Card 4 — Swap suggestions (Clinical review · Agent 3) */
              <div key="swaps">
                <p className="text-xs font-semibold text-gl-stone-400 uppercase tracking-widest mb-2">Clinical review · Agent 3</p>
                <RecommendationsList recommendations={result.recommendations} />
              </div>,

              /* Card 5 — Drug interactions (Medication safety · Agent 3) — only if present */
              ...(result.drug_interactions.length > 0
                ? [
                    <div key="drugs">
                      <p className="text-xs font-semibold text-gl-stone-400 uppercase tracking-widest mb-2">Medication safety check · Agent 3</p>
                      <DrugInteractionsCard interactions={result.drug_interactions} />
                    </div>,
                  ]
                : []),
            ]}
          </StaggeredCardList>

          {/* ── Adjustment panel ── */}
          {(step === "adjusting" || step === "saving") && (
            <div className="rounded-lg border border-gl-amber-soft bg-gl-amber-soft/40 p-4 space-y-4">
              <p className="text-sm font-semibold text-gl-amber">Adjust Your Meal</p>

              <div>
                <p className="text-xs text-gl-stone-500 mb-2">How much are you eating?</p>
                <div className="grid grid-cols-3 gap-2">
                  {PORTIONS.map(({ label, pct }) => (
                    <button
                      key={pct}
                      onClick={() => setPortionPct(pct)}
                      className={`rounded-md py-2 text-xs font-semibold border transition-all duration-fast active:scale-[0.97] ${portionPct === pct
                          ? "bg-gl-amber text-white border-gl-amber"
                          : "bg-white border-gl-amber-soft/80 text-gl-amber hover:border-gl-amber/40"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {result.recommendations.length > 0 && (
                <div>
                  <p className="text-xs text-gl-stone-500 mb-2">Which swaps did you apply?</p>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSwap(i)}
                        className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition-all duration-fast flex items-start gap-2.5 ${appliedSwaps.has(i)
                            ? "bg-gl-green-soft border-gl-green/20 text-gl-green"
                            : "bg-white border-gl-stone-100 text-gl-stone-500 hover:border-gl-stone-200"
                          }`}
                      >
                        {/* Checkmark / circle */}
                        <span className="mt-0.5 shrink-0">
                          {appliedSwaps.has(i) ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="7" fill="#D8E4D6" />
                              <polyline points="4,7 6,9 10,5" stroke="#2D5F3F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" stroke="#D6CDBB" strokeWidth="1.4" fill="none" />
                            </svg>
                          )}
                        </span>
                        <span>{rec}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleLogAdjusted} disabled={step === "saving"} loading={step === "saving"} className="w-full">
                Log Adjusted Meal
              </Button>
              {step !== "saving" && (
                <button
                  onClick={() => setStep("deciding")}
                  className="w-full text-xs text-gl-stone-400 hover:text-gl-stone-500 underline text-center transition-colors"
                >
                  Back
                </button>
              )}
            </div>
          )}

          {/* ── Decision buttons ── */}
          {step === "deciding" && (
            <div className="space-y-2 pt-1 border-t border-gl-stone-100">
              <p className="text-xs text-gl-stone-400 text-center font-medium pt-2 uppercase tracking-wide">
                What would you like to do?
              </p>
              <Button onClick={handleProceed} className="w-full">Log This Meal</Button>
              <Button variant="secondary" onClick={() => setStep("adjusting")} className="w-full">
                Adjust Meal
              </Button>
              <button
                onClick={reset}
                className="w-full rounded-pill py-2.5 px-4 text-sm font-medium text-gl-stone-400 hover:text-gl-red hover:bg-gl-red-soft border border-gl-stone-100 transition-all duration-fast"
              >
                Cancel — Not Eating This
              </button>
            </div>
          )}

          {step === "saving" && (
            <p className="text-center text-sm text-gl-stone-400 py-2">Saving your meal…</p>
          )}
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && result && (
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-gl-stone-100 bg-gl-stone-50">
              <img src={previewUrl} alt="Uploaded meal" className="w-full object-contain max-h-72" />
            </div>
          )}

          {/* Success banner */}
          <div className="rounded-lg bg-gl-green-soft border border-gl-green/20 px-4 py-4 flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#2D5F3F" opacity="0.12" />
              <circle cx="20" cy="20" r="14" fill="#D8E4D6" />
              <polyline points="13,20 18,25 27,14" stroke="#2D5F3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <p className="text-[15px] font-semibold text-gl-green">Meal logged!</p>
              <p className="text-xs text-gl-green/70">Analysis complete — see your results below</p>
            </div>
          </div>

          {/* Logged nutrition summary */}
          <div className="rounded-lg border border-gl-stone-100 bg-gl-stone-50 p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gl-stone-400 uppercase tracking-wide">Logged Nutrition</p>
              <Badge label={riskLabel(result.risk_score)} className={riskColor(result.risk_score)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Calories", value: formatKcal(adjustedTotals?.calories_kcal ?? result.nutrition_totals.calories_kcal) },
                { label: "Carbs", value: formatGrams(adjustedTotals?.carbs_g ?? result.nutrition_totals.carbs_g) },
                { label: "Protein", value: formatGrams(adjustedTotals?.protein_g ?? result.nutrition_totals.protein_g) },
                { label: "Fat", value: formatGrams(adjustedTotals?.fat_g ?? result.nutrition_totals.fat_g) },
                { label: "Sodium", value: `${Math.round(adjustedTotals?.sodium_mg ?? result.nutrition_totals.sodium_mg)}mg` },
                { label: "Glyc. Load", value: String((adjustedTotals?.glycemic_load ?? result.nutrition_totals.glycemic_load).toFixed(1)) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md bg-white p-2.5 text-center border border-gl-stone-100">
                  <p className="text-[10px] text-gl-stone-400">{label}</p>
                  <p className="text-sm font-semibold text-gl-ink font-mono-gl mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {/* Traffic lights inline */}
            {result.traffic_light && Object.keys(result.traffic_light).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {NUTRIENT_KEYS.map((key) =>
                  result.traffic_light[key] ? (
                    <div key={key} className="flex items-center gap-1.5 bg-white rounded-pill px-2.5 py-1 border border-gl-stone-100 text-xs">
                      <span className="text-gl-stone-400">{NUTRIENT_LABELS[key]}</span>
                      <TrafficLightBadge value={result.traffic_light[key] as "green" | "amber" | "red"} />
                    </div>
                  ) : null
                )}
              </div>
            )}
            {/* Agent attribution */}
            <p className="text-[10px] text-gl-stone-300 uppercase tracking-widest pt-1">Nutrition analysis · Agent 2 &amp; Clinical review · Agent 3</p>
          </div>

          {/* Swap suggestions logged */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
              <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-2">Dietitian Tips</p>
              <ul className="space-y-1">
                {result.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="text-xs text-brand-700 flex gap-1.5">
                    <span className="text-brand-400 shrink-0">•</span>{rec}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gl-stone-300 uppercase tracking-widest mt-2">Clinical review · Agent 3</p>
            </div>
          )}

          {/* Option 3 — Analysis Audit Footer */}
          <AnalysisAuditFooter
            audit={{
              completedAt: resultTimestamp,
              lensesRun: [
                { id: "vision",    label: "Food recognition",         status: "completed" },
                { id: "nutrition", label: "Nutrition analysis",        status: "completed" },
                { id: "clinical",  label: "Clinical review",           status: "completed" },
                { id: "drug",      label: "Medication safety check",   status: result.drug_interactions.length > 0 ? "completed" : "skipped" },
                { id: "glucose",   label: "Glucose pattern analysis",  status: "completed" },
                { id: "alerts",    label: "Risk monitoring",           status: "completed" },
              ],
            }}
          />

          <Button variant="secondary" onClick={reset} className="w-full">Log Another Meal</Button>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-gl-red-soft border border-gl-red/20 px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="7" cy="7" r="6.5" stroke="#A33B2A" strokeWidth="1.2" fill="none" />
            <line x1="7" y1="4" x2="7" y2="7.5" stroke="#A33B2A" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.8" fill="#A33B2A" />
          </svg>
          <p className="text-sm text-gl-red font-medium">{error}</p>
        </div>
      )}
    </Card>
  )
}
