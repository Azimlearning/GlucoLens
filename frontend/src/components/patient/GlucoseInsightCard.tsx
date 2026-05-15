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
  const borderColor = insight.severity === "high" ? "border-l-gl-red" : "border-l-gl-amber"

  return (
    <div className={clsx("rounded-lg bg-gl-bg-elev shadow-gl-sm border border-gl-stone-100 border-l-4 px-4 py-3.5", borderColor)}>
      <p className="text-sm font-semibold text-gl-ink">{insight.headline}</p>
      <p className="text-xs text-gl-stone-400 mt-1">{insight.subheadline}</p>
      <p className="text-xs text-gl-ink mt-2.5 font-medium">{insight.action}</p>
    </div>
  )
}
