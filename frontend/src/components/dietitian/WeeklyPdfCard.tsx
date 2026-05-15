import { useState } from "react"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { api } from "@/lib/api"

const REPORT_SECTIONS = [
  "7-day meal log with nutrition breakdown",
  "Daily calorie & carbohydrate trends",
  "Glycemic load analysis per meal",
  "Glucose readings & variability",
  "Traffic light risk score summary",
  "Drug-food interaction alerts",
  "Personalised swap suggestions",
  "Clinical notes for dietitian",
]

export function WeeklyPdfCard({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await api.downloadReportForPatient(patientId)
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `GlucoLens_Report_${patientId.slice(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setPdfUrl("downloaded")
    } catch {
      setError("Failed to generate report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Weekly Clinical Report</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Malaysian clinical standard · MOH T2DM guidelines · PDM format
          </p>
        </div>
        <span className="text-2xl">📋</span>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mb-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Report includes:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {REPORT_SECTIONS.map((s) => (
            <span key={s} className="text-xs text-slate-500 flex gap-1.5">
              <span className="text-emerald-500 shrink-0">✓</span>{s}
            </span>
          ))}
        </div>
      </div>

      {pdfUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
            <span>✅</span>
            <p className="text-sm text-emerald-700 font-medium">Report ready</p>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-700 transition-colors"
          >
            Open PDF Report
          </a>
          <button
            onClick={() => { setPdfUrl(null); setError("") }}
            className="w-full text-xs text-slate-400 hover:text-slate-600 py-1"
          >
            Generate new report
          </button>
        </div>
      ) : (
        <>
          <Button onClick={handleGenerate} loading={loading} className="w-full">
            Generate Weekly Report
          </Button>
          {error && (
            <p className="mt-2 text-xs text-amber-600">{error}</p>
          )}
        </>
      )}
    </Card>
  )
}
