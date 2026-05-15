import { AgentTag } from "@/components/shared/AgentTag"

interface RecommendationsListProps {
  recommendations: string[]
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      <p className="text-sm font-medium text-gl-stone-500 mb-2">Swap Suggestions</p>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-xl bg-gl-stone-50 border border-gl-stone-100 px-3 py-2.5">
            {/* Leaf icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
              <path d="M2 14C2 14 3 8 8 5C13 2 14 2 14 2C14 2 14 3 11 8C8 13 2 14 2 14Z" fill="#C8893A" opacity="0.7" />
              <circle cx="8" cy="8" r="1.5" fill="#A8702A" />
            </svg>
            <p className="text-sm text-gl-ink-soft">{rec}</p>
          </li>
        ))}
      </ul>
      <AgentTag label="Clinical review" agent={3} />
    </div>
  )
}
