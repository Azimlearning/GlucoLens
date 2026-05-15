import { Badge } from "@/components/shared/Badge"
import clsx from "clsx"

interface Interaction {
  food: string
  medication: string
  severity: string
  note: string
}

interface DrugInteractionsCardProps {
  interactions: Interaction[]
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  moderate: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-red-600 bg-red-50 border-red-200",
  critical: "text-red-600 bg-red-50 border-red-200",
}

export function DrugInteractionsCard({ interactions }: DrugInteractionsCardProps) {
  if (!interactions || interactions.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">⚠️</span>
        <p className="text-sm font-semibold text-amber-800">Drug-Food Interactions</p>
      </div>
      <ul className="space-y-3">
        {interactions.map((item, i) => (
          <li key={i} className="bg-white rounded-xl p-3 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-800">
                {item.food} + {item.medication}
              </span>
              <Badge
                label={item.severity}
                className={clsx(SEVERITY_COLORS[item.severity.toLowerCase()] ?? "text-slate-600 bg-slate-50 border-slate-200")}
              />
            </div>
            <p className="text-xs text-slate-600">{item.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
