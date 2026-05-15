import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { PatientDrilldown } from "@/components/dietitian/PatientDrilldown"
import { AlertHistoryTable } from "@/components/dietitian/AlertHistoryTable"
import { MisinfoLog } from "@/components/dietitian/MisinfoLog"
import { WeeklyPdfCard } from "@/components/dietitian/WeeklyPdfCard"
import { MeetingPlanCard } from "@/components/dietitian/MeetingPlanCard"
import { Spinner } from "@/components/shared/Spinner"
import { Card } from "@/components/shared/Card"
import apiClient from "@/lib/api"
import type { PatientProfile } from "@/lib/types"
import clsx from "clsx"

type TabKey = "meals" | "alerts" | "misinfo" | "report" | "meeting"

const TABS: { key: TabKey; label: string }[] = [
  { key: "meals",   label: "Meals" },
  { key: "alerts",  label: "Alerts" },
  { key: "misinfo", label: "Misinfo" },
  { key: "report",  label: "Report" },
  { key: "meeting", label: "Meeting Plan" },
]

export default function PatientDetailPage() {
  const router = useRouter()
  const { patient_id } = router.query
  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("meals")

  useEffect(() => {
    if (!patient_id || typeof patient_id !== "string") return
    setLoading(true)
    setError("")
    apiClient
      .get(`/patients/${patient_id}`)
      .then(({ data }) => {
        setPatient(data)
      })
      .catch(() => {
        setError("Failed to load patient profile.")
      })
      .finally(() => setLoading(false))
  }, [patient_id])

  return (
    <ProtectedRoute requiredRole="dietitian">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <Link href="/dietitian" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-700">GlucoLens</h1>
            {patient && <p className="text-sm text-slate-500">{patient.name}</p>}
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {loading && (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          )}
          {patient && !loading && (
            <>
              <Card className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{patient.name}</h2>
                    <p className="text-sm text-slate-500">
                      Age {patient.age} · {patient.gender} · BMI {patient.bmi} · HbA1c {patient.hba1c_percent}%
                    </p>
                  </div>
                  {patient.medications.length > 0 && (
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Medications:</span> {patient.medications.join(", ")}
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex gap-2 mb-6">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                      activeTab === tab.key
                        ? "bg-slate-800 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "meals" && <PatientDrilldown patient={patient} />}
              {activeTab === "alerts" && (
                <Card>
                  <h3 className="font-semibold text-slate-800 mb-4">Alert History</h3>
                  <AlertHistoryTable patientId={patient.uid} />
                </Card>
              )}
              {activeTab === "misinfo" && (
                <Card>
                  <h3 className="font-semibold text-slate-800 mb-4">Misinfo Log</h3>
                  <MisinfoLog patientId={patient.uid} />
                </Card>
              )}
              {activeTab === "report"   && <WeeklyPdfCard patientId={patient.uid} />}
              {activeTab === "meeting" && <MeetingPlanCard patientId={patient.uid} />}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
