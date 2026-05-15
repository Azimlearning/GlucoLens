import { Badge } from "@/components/shared/Badge"
import { VERDICT_COLORS, VERDICT_LABELS } from "@/lib/constants"
import type { MisinfoVerdict } from "@/lib/types"

interface VerdictCardProps {
  verdict: MisinfoVerdict
  explanation: string
  sources?: string[]
}

export function VerdictCard({ verdict, explanation, sources }: VerdictCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Verdict:</span>
        <Badge label={VERDICT_LABELS[verdict] ?? verdict} className={VERDICT_COLORS[verdict]} />
      </div>
      <p className="text-sm text-slate-700">{explanation}</p>
      {sources && sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Sources</p>
          <ul className="space-y-1">
            {sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline break-all"
                >
                  {src}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
