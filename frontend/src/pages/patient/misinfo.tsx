import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { MisinfoChecker } from "@/components/patient/MisinfoChecker"

export default function MisinfoPage() {
  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <Link href="/patient" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-700">GlucoLens</h1>
            <p className="text-sm text-slate-500">Check Health Claims</p>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <MisinfoChecker />
        </main>
      </div>
    </ProtectedRoute>
  )
}
