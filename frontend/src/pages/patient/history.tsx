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
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <Link href="/patient" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-700">GlucoLens</h1>
            <p className="text-sm text-slate-500">Meal History</p>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">All Meals</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : meals.length === 0 ? (
            <EmptyState
              icon="🍽️"
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
