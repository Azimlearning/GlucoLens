import { useEffect, useState } from "react"
import clsx from "clsx"

const STAGES = [
  { label: "Reading photo", agent: "Vision" },
  { label: "Calculating nutrition", agent: "Nutrition" },
  { label: "Clinical check", agent: "Clinical" },
  { label: "Alert scan", agent: "Alert" },
  { label: "Dashboard ready", agent: "Dashboard" },
]

interface AgentStatusTickerProps {
  active: boolean
}

export function AgentStatusTicker({ active }: AgentStatusTickerProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!active) {
      setCurrent(0)
      return
    }
    setCurrent(0)
    const interval = setInterval(() => {
      setCurrent((prev) => {
        if (prev >= STAGES.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <div className="space-y-2 py-2">
      {STAGES.map((stage, index) => {
        const done = index < current
        const inProgress = index === current
        const pending = index > current
        return (
          <div
            key={stage.agent}
            className={clsx(
              "flex items-center gap-3 text-sm transition-opacity duration-300",
              pending && "opacity-30"
            )}
          >
            {done && (
              <span className="text-emerald-500 font-bold w-5 text-center">✓</span>
            )}
            {inProgress && (
              <span className="inline-block w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            {pending && (
              <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
            )}
            <span className={clsx("font-medium", done && "text-emerald-600", inProgress && "text-slate-800", pending && "text-slate-400")}>
              {stage.label}
            </span>
            <span className="text-xs text-slate-400">({stage.agent})</span>
          </div>
        )
      })}
    </div>
  )
}
