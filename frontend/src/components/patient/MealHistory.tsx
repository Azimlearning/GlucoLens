import { Card } from "@/components/shared/Card"
import { TrafficLightBadge, TrafficLightDot } from "@/components/shared/TrafficLight"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentMeals } from "@/hooks/usePatientData"
import { useAuth } from "@/contexts/AuthContext"

export function MealHistory() {
  const { user } = useAuth()
  const { meals, loading } = useRecentMeals(user?.uid ?? "")
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Meals</h2>
      {loading ? <div className="flex justify-center py-8"><Spinner /></div>
        : meals.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No meals logged yet</p>
        : <ul className="space-y-3">{meals.map((meal) => (
            <li key={meal.meal_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <TrafficLightDot value={meal.traffic_light} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{meal.name}</p>
                  <p className="text-xs text-slate-400">{new Date(meal.timestamp).toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })} · {meal.calories} kcal · {meal.carbs_g}g carbs</p>
                </div>
              </div>
              <TrafficLightBadge value={meal.traffic_light} />
            </li>
          ))}</ul>}
    </Card>
  )
}