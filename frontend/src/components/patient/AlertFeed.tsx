import { Card } from "@/components/shared/Card"
import { Badge } from "@/components/shared/Badge"
import { AgentTag } from "@/components/shared/AgentTag"
import { useAlerts } from "@/hooks/usePatientData"
import { useAuth } from "@/contexts/AuthContext"

const SEV: Record<string, string> = {
  critical: "text-gl-red   bg-gl-red-soft   border-transparent",
  high:     "text-gl-red   bg-gl-red-soft   border-transparent",
  medium:   "text-gl-amber bg-gl-amber-soft border-transparent",
  low:      "text-gl-stone-500 bg-gl-stone-50 border-gl-stone-100",
}

export function AlertFeed() {
  const { user } = useAuth()
  const alerts = useAlerts(user?.uid ?? "")
  const recent = [...alerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5)
  if (recent.length === 0) return null
  return (
    <Card>
      <h2 className="text-h4 font-semibold text-gl-ink mb-4">Alerts</h2>
      <ul className="space-y-2">
        {recent.map((alert) => (
          <li key={alert.alert_id} className="flex items-start gap-3 rounded-md bg-gl-stone-50 border border-gl-stone-100 px-4 py-3">
            <Badge label={alert.severity.toUpperCase()} className={SEV[alert.severity]} />
            <div>
              <p className="text-sm text-gl-ink-soft">{alert.message}</p>
              <p className="text-xs text-gl-stone-400 mt-0.5">{new Date(alert.timestamp).toLocaleString("en-MY")}</p>
            </div>
          </li>
        ))}
      </ul>
      <AgentTag label="Risk monitoring" agent={5} />
    </Card>
  )
}
