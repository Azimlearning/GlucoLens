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
  critical: "text-red-600 bg-red-50 border-red-200",
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
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
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No alerts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Severity</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Type</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 text-xs">Message</th>
                <th className="pb-2 font-medium text-slate-500 text-xs whitespace-nowrap">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((alert) => (
                <tr key={alert.alert_id}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Badge
                      label={alert.severity}
                      className={SEVERITY_COLORS[alert.severity] ?? "text-slate-600 bg-slate-50 border-slate-200"}
                    />
                  </td>
                  <td className="py-2 pr-4 text-slate-600 whitespace-nowrap capitalize">{alert.type}</td>
                  <td className="py-2 pr-4 text-slate-700">{alert.message}</td>
                  <td className="py-2 text-slate-400 whitespace-nowrap text-xs">{formatDateTime(alert.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
