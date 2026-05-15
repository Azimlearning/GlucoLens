import { useState, useEffect, useRef } from "react"
import { AGENT_STAGES } from "@/constants/agentStages"

/**
 * Cycles through agent stage labels while isAnalysing is true.
 * Durations are cosmetic — independent of real pipeline.
 * Returns tickerDone so callers can gate result display until all stages show.
 */
export function useAgentTicker(isAnalysing: boolean) {
  const [stageIndex, setStageIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isAnalysing) {
      setStageIndex(0)
      return
    }

    setStageIndex(0)

    const advance = (index: number) => {
      if (index >= AGENT_STAGES.length) return
      timerRef.current = setTimeout(() => {
        setStageIndex(index + 1)
        advance(index + 1)
      }, AGENT_STAGES[index].durationMs)
    }

    advance(0)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isAnalysing])

  const currentStage = AGENT_STAGES[stageIndex]
  const currentLabel = currentStage?.label ?? "Finalising…"
  const progress = Math.min(stageIndex / AGENT_STAGES.length, 1)
  const tickerDone = stageIndex >= AGENT_STAGES.length

  return { currentLabel, progress, stageIndex, tickerDone }
}
