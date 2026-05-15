interface RecommendationsListProps {
  recommendations: string[]
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      <p className="text-sm font-medium text-slate-600 mb-2">Recommendations</p>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-base mt-0.5">💡</span>
            <p className="text-sm text-slate-700">{rec}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
