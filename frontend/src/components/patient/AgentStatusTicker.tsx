"use client"
import { useAgentTicker } from "@/hooks/useAgentTicker"
import { AGENT_STAGES } from "@/constants/agentStages"

/**
 * AgentStatusTicker — upgraded version.
 *
 * During meal analysis, cycles through all 6 agent stages with:
 *  - A smooth progress bar that advances per stage
 *  - A checklist showing done ✓ / in-progress spinner / pending stages
 *  - Per-stage durations from agentStages.ts (cosmetic, not real timing)
 */

interface Props {
  active: boolean
}

export function AgentStatusTicker({ active }: Props) {
  const { stageIndex, progress } = useAgentTicker(active)

  if (!active) return null

  return (
    <div className="space-y-4">
      {/* Progress track */}
      <div className="w-full h-1 bg-gl-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Stage checklist */}
      <div className="space-y-2">
        {AGENT_STAGES.map((stage, index) => {
          const done = index < stageIndex
          const inProgress = index === stageIndex
          const pending = index > stageIndex

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 transition-opacity duration-300 ${pending ? "opacity-30" : "opacity-100"}`}
            >
              {/* Status icon */}
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {done && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="Done">
                    <circle cx="9" cy="9" r="9" fill="#D8E4D6" />
                    <polyline points="5,9 8,12 13,6" stroke="#2D5F3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
                {inProgress && (
                  <span
                    className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin block"
                    aria-label="In progress"
                  />
                )}
                {pending && (
                  <span className="w-4 h-4 rounded-full border-2 border-gl-stone-200 block" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  done ? "text-gl-green" : inProgress ? "text-gl-ink" : "text-gl-stone-400"
                }`}
              >
                {stage.label}
              </span>

              {/* Agent tag on done stages */}
              {done && (
                <span className="ml-auto text-[10px] uppercase tracking-widest text-gl-stone-300">
                  Agent {index + 1}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Finalising row */}
      {stageIndex >= AGENT_STAGES.length && (
        <p className="text-xs text-gl-stone-400 text-center animate-pulse">Finalising results…</p>
      )}
    </div>
  )
}
