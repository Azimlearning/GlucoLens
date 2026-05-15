/**
 * TrendsTab — Analytics deep-dive
 * Sections: Glucose trends, Glucose breakdown, 7-day nutrition,
 * Weekly calorie summary (Feature 3), Full meal history
 * All sections are always fully expanded — no collapse toggles.
 */
import type { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { GlucoseChartCard } from "./GlucoseChartCard"
import { GlucoseSummaryChart } from "./GlucoseSummaryChart"
import { NutritionHistoryCard } from "./NutritionHistoryCard"
import { WeeklyCalorieSummary } from "./WeeklyCalorieSummary"
import { MealHistory } from "./MealHistory"

// Section label — no collapse, just a visual divider
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <h2 className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-gl-stone-100" />
    </div>
  )
}

export function TrendsTab() {
  const { user } = useAuth()
  const uid = user?.uid ?? ""

  return (
    <div className="space-y-4">

      <SectionLabel>Glucose Trends</SectionLabel>
      <GlucoseChartCard uid={uid} />
      <GlucoseSummaryChart uid={uid} />

      <SectionLabel>Nutrition History</SectionLabel>
      <NutritionHistoryCard uid={uid} />
      <WeeklyCalorieSummary uid={uid} />

      <SectionLabel>Meal History</SectionLabel>
      <MealHistory />

    </div>
  )
}
