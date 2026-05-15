import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { MealUpload } from "@/components/patient/MealUpload"
import { MealHistory } from "@/components/patient/MealHistory"
import { GlucoseLog } from "@/components/patient/GlucoseLog"
import { MisinfoChecker } from "@/components/patient/MisinfoChecker"
import { AlertFeed } from "@/components/patient/AlertFeed"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/shared/Button"

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">GlucoLens</h1>
            <p className="text-sm text-slate-500">Hello, {user?.name}</p>
          </div>
          <Button variant="secondary" onClick={logout}>Sign Out</Button>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <AlertFeed />
          <MealUpload />
          <GlucoseLog />
          <MealHistory />
          <MisinfoChecker />
        </main>
      </div>
    </ProtectedRoute>
  )
}