import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { MealUpload } from "@/components/patient/MealUpload"
import { MealHistory } from "@/components/patient/MealHistory"
import { GlucoseLog } from "@/components/patient/GlucoseLog"
import { MisinfoChecker } from "@/components/patient/MisinfoChecker"
import { AlertFeed } from "@/components/patient/AlertFeed"
import { DashboardSummaryCard } from "@/components/patient/DashboardSummaryCard"
import { WeeklyReportCard } from "@/components/patient/WeeklyReportCard"
import { NutritionHistoryCard } from "@/components/patient/NutritionHistoryCard"
import { GlucoseChartCard } from "@/components/patient/GlucoseChartCard"
import { GlucoseSummaryChart } from "@/components/patient/GlucoseSummaryChart"
import { AppointmentPrepCard } from "@/components/patient/AppointmentPrepCard"
import { UserProfileCard } from "@/components/patient/UserProfileCard"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/shared/Button"

export default function PatientDashboard() {
  const { user, logout } = useAuth()


  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-gl-bg">
        {/* ── Top bar ── */}
        <header className="bg-gl-bg-elev border-b border-gl-stone-100 shadow-gl-sm px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              <h1 className="font-display text-[18px] sm:text-[20px] text-gl-ink leading-none">
                GlucoLens
              </h1>
            </div>
            <p className="text-xs text-gl-stone-400 mt-0.5 ml-4 truncate">
              Hello, {user?.name}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 sm:py-7 space-y-4 sm:space-y-5">
          <DashboardSummaryCard uid={user?.uid ?? ""} name={user?.name} />
          <AlertFeed />
          <MealUpload />
          <GlucoseLog />
          <GlucoseChartCard uid={user?.uid ?? ""} />
          <GlucoseSummaryChart uid={user?.uid ?? ""} />
          <NutritionHistoryCard uid={user?.uid ?? ""} />
          <MealHistory />
          <MisinfoChecker />
          <AppointmentPrepCard uid={user?.uid ?? ""} />
          <WeeklyReportCard />
          <UserProfileCard uid={user?.uid ?? ""} />
        </main>
      </div>
    </ProtectedRoute>
  )
}
