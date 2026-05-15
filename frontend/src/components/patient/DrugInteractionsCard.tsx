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
  low:      "text-gl-green bg-gl-green-soft border-transparent",
  medium:   "text-gl-amber bg-gl-amber-soft border-transparent",
  moderate: "text-gl-amber bg-gl-amber-soft border-transparent",
  high:     "text-gl-red   bg-gl-red-soft   border-transparent",
  critical: "text-gl-red   bg-gl-red-soft   border-transparent",
}

export function DrugInteractionsCard({ interactions }: DrugInteractionsCardProps) {
  if (!interactions || interactions.length === 0) return null

  return (
    <div className="rounded-lg border border-gl-amber-soft bg-gl-amber-soft/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        {/* Warning triangle SVG — no emoji */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2 L14 13 L2 13 Z" fill="#F2E2BC" stroke="#B7791F" strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="#B7791F" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.7" fill="#B7791F" />
        </svg>
        <p className="text-sm font-semibold text-gl-amber">Drug-Food Interactions</p>
      </div>
      <ul className="space-y-3">
        {interactions.map((item, i) => (
          <li key={i} className="bg-gl-bg-elev rounded-md p-3 border border-gl-stone-100">
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-sm font-medium text-gl-ink truncate">
                {item.food} + {item.medication}
              </span>
              <Badge
                label={item.severity}
                className={clsx(SEVERITY_COLORS[item.severity.toLowerCase()] ?? "text-gl-stone-500 bg-gl-stone-50 border-gl-stone-100")}
              />
            </div>
            <p className="text-xs text-gl-stone-500">{item.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
