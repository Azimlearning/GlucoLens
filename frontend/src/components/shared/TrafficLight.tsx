import clsx from "clsx"
import { Badge } from "./Badge"
import { TRAFFIC_LIGHT_LABELS } from "@/lib/constants"
import type { TrafficLight as TL } from "@/lib/types"

const variantMap: Record<TL, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red:   "red",
}

export function TrafficLightBadge({ value }: { value: TL }) {
  return (
    <Badge
      label={TRAFFIC_LIGHT_LABELS[value] ?? value}
      variant={variantMap[value] ?? "default"}
    />
  )
}

export function TrafficLightDot({ value }: { value: TL }) {
  const colors: Record<TL, string> = {
    green: "bg-gl-green",
    amber: "bg-gl-amber",
    red:   "bg-gl-red",
  }
  return (
    <span
      className={clsx("inline-block w-3 h-3 rounded-full", colors[value])}
      aria-label={value}
    />
  )
}
