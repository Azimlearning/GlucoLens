/**
 * Agent stage definitions for the meal analysis ticker.
 * Durations are cosmetic — they cycle independently of the real pipeline.
 * Labels map directly to the actual GlucoLens LangGraph agents.
 */
export const AGENT_STAGES = [
  { id: "vision",    label: "Identifying dishes…",          durationMs: 700  },
  { id: "nutrition", label: "Calculating nutrition…",       durationMs: 800  },
  { id: "clinical",  label: "Running clinical review…",     durationMs: 900  },
  { id: "drug",      label: "Checking medication safety…",  durationMs: 700  },
  { id: "glucose",   label: "Analysing glucose patterns…",  durationMs: 600  },
  { id: "alerts",    label: "Scanning for risk alerts…",    durationMs: 500  },
] as const

export type AgentStageId = typeof AGENT_STAGES[number]["id"]
