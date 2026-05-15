import { useState } from "react"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { api } from "@/lib/api"

const REPORT_SECTIONS = [
  "7-day meal log with nutrition totals",
  "Daily calorie & carb trends (chart)",
  "Glycemic load analysis per meal",
  "Glucose readings summary",
  "Traffic light risk score history",
  "Drug-food interaction alerts",
  "Personalised swap suggestions",
  "Clinical notes section for dietitian",
]

export function WeeklyReportCard() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const handleDownload = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await api.downloadReport()
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `GlucoLens_Weekly_Report.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e: any) {
      const status = e?.response?.status
      const detail = e?.response?.data?.detail ?? e?.message ?? "Failed to generate report."
      if (status === 404) {
        setError("Report endpoint not found — please restart the backend server.")
      } else if (status === 401) {
        setError("Session expired — please sign out and back in.")
      } else {
        setError(typeof detail === "string" ? detail : "Failed to generate report.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Weekly Summary Report</h2>
          <p className="text-xs text-slate-400 mt-0.5">Your 7-day clinical brief — share with your dietitian</p>
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

      {done && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 mb-3">
          <span>✅</span>
          <p className="text-sm text-emerald-700 font-medium">Report downloaded successfully</p>
        </div>
      )}

      <Button onClick={handleDownload} loading={loading} className="w-full">
        {loading ? "Generating report…" : "Download PDF Report"}
      </Button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <p className="text-xs text-slate-300 text-center mt-3">
        Generated fresh each time · Based on MOH T2DM guidelines
      </p>
    </Card>
  )
}
