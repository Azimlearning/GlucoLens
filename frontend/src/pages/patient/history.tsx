import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { MealCard } from "@/components/patient/MealCard"
import { Spinner } from "@/components/shared/Spinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { useAuth } from "@/contexts/AuthContext"
import { useMealHistory } from "@/hooks/useMealHistory"

export default function MealHistoryPage() {
  const { user } = useAuth()
  const { meals, loading } = useMealHistory(user?.uid ?? "", 30)

  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-gl-bg">
        <header className="bg-gl-bg-elev border-b border-gl-stone-100 shadow-gl-sm px-6 py-4 flex items-center gap-4">
          <Link href="/patient" className="text-sm text-gl-stone-400 hover:text-gl-ink transition-colors">
            ← Back
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <h1 className="font-display text-[18px] text-gl-ink">GlucoLens</h1>
            </div>
            <p className="text-sm text-gl-stone-400 ml-4">Meal History</p>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h2 className="text-h4 font-semibold text-gl-ink mb-4">All Meals</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : meals.length === 0 ? (
            <EmptyState
              title="No meals logged yet"
              description="Upload a meal photo from your dashboard to get started."
            />
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => (
                <MealCard key={meal.meal_id} meal={meal} />
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
