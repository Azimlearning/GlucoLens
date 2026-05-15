import { TrafficLightDot, TrafficLightBadge } from "@/components/shared/TrafficLight"
import { Badge } from "@/components/shared/Badge"
import { formatDateTime, riskLabel, riskColor } from "@/lib/format"
import type { MealRecord } from "@/lib/types"

interface MealCardProps {
  meal: MealRecord
}

export function MealCard({ meal }: MealCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <TrafficLightDot value={meal.traffic_light} />
        <div>
          <p className="text-sm font-medium text-slate-800">{meal.name}</p>
          <p className="text-xs text-slate-400">
            {formatDateTime(meal.timestamp)} · {meal.calories} kcal · {meal.carbs_g}g carbs
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge label={riskLabel(meal.meal_risk_score)} className={riskColor(meal.meal_risk_score)} />
        <TrafficLightBadge value={meal.traffic_light} />
      </div>
    </div>
  )
}
