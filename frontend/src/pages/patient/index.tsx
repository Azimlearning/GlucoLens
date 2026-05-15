import { useState } from "react"
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
import { AppointmentPrepCard } from "@/components/patient/AppointmentPrepCard"
import { UserProfileCard } from "@/components/patient/UserProfileCard"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/shared/Button"

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const [lang, setLang] = useState<"EN" | "BM">("EN")
  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-brand-700 leading-tight">GlucoLens</h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">Hello, {user?.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setLang("EN")}
                className={`px-2 py-1.5 transition-colors ${lang === "EN" ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >EN</button>
              <button
                onClick={() => setLang("BM")}
                title="Bahasa Melayu (coming soon)"
                className={`px-2 py-1.5 transition-colors ${lang === "BM" ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >BM</button>
            </div>
            <Button variant="secondary" onClick={logout} className="text-xs px-2.5 py-1.5">Sign Out</Button>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <DashboardSummaryCard uid={user?.uid ?? ""} name={user?.name} />
          <AlertFeed />
          <MealUpload />
          <GlucoseLog />
          <GlucoseChartCard uid={user?.uid ?? ""} />
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