import { Card } from "@/components/shared/Card"
import { Badge } from "@/components/shared/Badge"
import { useAlerts } from "@/hooks/usePatientData"
import { useAuth } from "@/contexts/AuthContext"

const SEV: Record<string,string> = { critical: "text-red-700 bg-red-50 border-red-200", high: "text-red-600 bg-red-50 border-red-100", medium: "text-amber-600 bg-amber-50 border-amber-100", low: "text-slate-600 bg-slate-50 border-slate-200" }

export function AlertFeed() {
  const { user } = useAuth()
  const alerts = useAlerts(user?.uid ?? "")
  const recent = [...alerts].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0,5)
  if (recent.length === 0) return null
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Alerts</h2>
      <ul className="space-y-2">{recent.map((alert) => (
        <li key={alert.alert_id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <Badge label={alert.severity.toUpperCase()} className={SEV[alert.severity]} />
          <div>
            <p className="text-sm text-slate-700">{alert.message}</p>
            <p className="text-xs text-slate-400 mt-0.5">{new Date(alert.timestamp).toLocaleString("en-MY")}</p>
          </div>
        </li>
      ))}</ul>
    </Card>
  )
}