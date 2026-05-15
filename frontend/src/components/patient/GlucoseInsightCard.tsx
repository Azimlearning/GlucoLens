import clsx from "clsx"

interface GlucoseInsight {
  headline: string
  subheadline: string
  severity: "high" | "medium"
  action: string
}

interface GlucoseInsightCardProps {
  insight: GlucoseInsight
}

export function GlucoseInsightCard({ insight }: GlucoseInsightCardProps) {
  const borderColor = insight.severity === "high" ? "border-l-red-500" : "border-l-amber-500"

  return (
    <div className={clsx("rounded-2xl bg-white shadow-sm border border-slate-200 border-l-4 p-6", borderColor)}>
      <p className="text-sm font-semibold text-slate-800">{insight.headline}</p>
      <p className="text-xs text-slate-500 mt-1">{insight.subheadline}</p>
      <p className="text-xs text-slate-600 mt-3 font-medium">{insight.action}</p>
    </div>
  )
}
