import { useEffect, useState } from "react"
import clsx from "clsx"
import { AgentIcon } from "@/components/shared/Illustrations"

const STAGES: { label: string; agent: "vision" | "nutrition" | "clinical" | "alert" | "dashboard" }[] = [
  { label: "Reading photo",       agent: "vision"    },
  { label: "Calculating nutrition", agent: "nutrition" },
  { label: "Clinical check",      agent: "clinical"  },
  { label: "Alert scan",          agent: "alert"     },
  { label: "Dashboard ready",     agent: "dashboard" },
]

interface AgentStatusTickerProps {
  active: boolean
}

export function AgentStatusTicker({ active }: AgentStatusTickerProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!active) { setCurrent(0); return }
    setCurrent(0)
    const interval = setInterval(() => {
      setCurrent((prev) => {
        if (prev >= STAGES.length - 1) { clearInterval(interval); return prev }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <div className="space-y-2 py-2">
      {STAGES.map((stage, index) => {
        const done       = index < current
        const inProgress = index === current
        const pending    = index > current
        return (
          <div
            key={stage.agent}
            className={clsx(
              "flex items-center gap-3 transition-opacity duration-300",
              pending && "opacity-30"
            )}
          >
            {/* Status indicator */}
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              {done && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Done">
                  <circle cx="10" cy="10" r="10" fill="#D8E4D6" />
                  <polyline points="6,10 9,13 14,7" stroke="#2D5F3F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
              {inProgress && (
                <span
                  className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin block"
                  aria-label="In progress"
                />
              )}
              {pending && (
                <span className="w-5 h-5 rounded-full border-2 border-gl-stone-200 block" />
              )}
            </div>

            {/* Agent icon */}
            <AgentIcon
              agent={stage.agent}
              className={clsx(
                "w-6 h-6 shrink-0 transition-opacity duration-300",
                done       && "opacity-100",
                inProgress && "opacity-100",
                pending    && "opacity-40"
              )}
            />

            {/* Label */}
            <span
              className={clsx(
                "text-sm font-medium transition-colors duration-300",
                done       && "text-gl-green",
                inProgress && "text-gl-ink",
                pending    && "text-gl-stone-400"
              )}
            >
              {stage.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
