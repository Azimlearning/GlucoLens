import clsx from "clsx"
import { Badge } from "./Badge"
import { TRAFFIC_LIGHT_COLORS, TRAFFIC_LIGHT_LABELS } from "@/lib/constants"
import type { TrafficLight as TL } from "@/lib/types"

export function TrafficLightBadge({ value }: { value: TL }) {
  return <Badge label={TRAFFIC_LIGHT_LABELS[value] ?? value} className={TRAFFIC_LIGHT_COLORS[value]} />
}

export function TrafficLightDot({ value }: { value: TL }) {
  const colors = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }
  return <span className={clsx("inline-block w-3 h-3 rounded-full", colors[value])} aria-label={value} />
}
