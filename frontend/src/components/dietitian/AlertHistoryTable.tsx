import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Badge } from "@/components/shared/Badge"
import { Spinner } from "@/components/shared/Spinner"
import { formatDateTime } from "@/lib/format"
import clsx from "clsx"
import type { Alert } from "@/lib/types"

interface AlertHistoryTableProps {
  patientId: string
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-gl-red   bg-gl-red-soft   border-transparent",
  high:     "text-gl-red   bg-gl-red-soft   border-transparent",
  medium:   "text-gl-amber bg-gl-amber-soft border-transparent",
  low:      "text-gl-green bg-gl-green-soft border-transparent",
}

type FilterTab = "all" | "critical" | "medium" | "low"

export function AlertHistoryTable({ patientId }: AlertHistoryTableProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")

  useEffect(() => {
    if (!patientId) return
    const q = query(
      collection(db, `patients/${patientId}/alerts`),
      orderBy("timestamp", "desc"),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map((d) => d.data() as Alert))
      setLoading(false)
    })
    return unsub
  }, [patientId])

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "critical", label: "Critical" },
    { key: "medium", label: "Moderate" },
    { key: "low", label: "Minor" },
  ]

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={clsx(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-gl-ink text-gl-bg"
                : "bg-gl-stone-50 text-gl-stone-500 hover:bg-gl-stone-100"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gl-stone-400 text-center py-8">No alerts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gl-stone-100">
                <th className="pb-2 pr-4 font-semibold text-gl-stone-400 text-xs whitespace-nowrap">Severity</th>
                <th className="pb-2 pr-4 font-semibold text-gl-stone-400 text-xs whitespace-nowrap">Type</th>
                <th className="pb-2 pr-4 font-semibold text-gl-stone-400 text-xs">Message</th>
                <th className="pb-2 font-semibold text-gl-stone-400 text-xs whitespace-nowrap">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gl-stone-100">
              {filtered.map((alert) => (
                <tr key={alert.alert_id}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Badge
                      label={alert.severity}
                      className={SEVERITY_COLORS[alert.severity] ?? "text-gl-stone-500 bg-gl-stone-50 border-gl-stone-100"}
                    />
                  </td>
                  <td className="py-2 pr-4 text-gl-stone-500 whitespace-nowrap capitalize">{alert.type}</td>
                  <td className="py-2 pr-4 text-gl-ink-soft">{alert.message}</td>
                  <td className="py-2 text-gl-stone-400 whitespace-nowrap text-xs">{formatDateTime(alert.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
