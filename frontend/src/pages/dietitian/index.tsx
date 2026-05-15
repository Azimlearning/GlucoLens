import { useState } from "react"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { PatientCard } from "@/components/dietitian/PatientCard"
import { PatientDrilldown } from "@/components/dietitian/PatientDrilldown"
import { Spinner } from "@/components/shared/Spinner"
import { Button } from "@/components/shared/Button"
import { useAuth } from "@/contexts/AuthContext"
import { usePatientList } from "@/hooks/useDietitianData"
import { api } from "@/lib/api"
import type { PatientProfile } from "@/lib/types"

export default function DietitianDashboard() {
  const { user, logout } = useAuth()
  const { patients, loading } = usePatientList(user?.uid ?? "")
  const [selected, setSelected] = useState<PatientProfile | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerateReport = async () => {
    if (!selected) return
    setGenerating(true)
    try {
      const { data } = await api.generateReport()
      if (data.report_url) window.open(data.report_url, "_blank")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="dietitian">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">GlucoLens</h1>
            <p className="text-sm text-slate-500">Dr. {user?.name}</p>
          </div>
          <Button variant="secondary" onClick={logout}>Sign Out</Button>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Patients</h2>
              {loading ? <Spinner /> : (
                <div className="space-y-3">
                  {patients.map((p) => (
                    <PatientCard key={p.uid} patient={p} onClick={() => setSelected(p)} />
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              {selected ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">{selected.name}</h2>
                    <Button onClick={handleGenerateReport} loading={generating} variant="secondary">
                      Generate Weekly Report
                    </Button>
                  </div>
                  <PatientDrilldown patient={selected} />
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                  Select a patient to view details
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}