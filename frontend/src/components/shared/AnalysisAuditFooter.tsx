"use client"
import { useState } from "react"
import { AGENT_STAGES } from "@/constants/agentStages"

/**
 * AnalysisAuditFooter — Option 3
 *
 * A collapsible "Analysed by N lenses" footer shown below all result cards.
 * Derives lens count from the result data passed to it — no new Firestore field needed.
 * Shows which agents fired and when. Expands on tap to show full audit receipt.
 */

interface LensEntry {
  id: string
  label: string
  status: "completed" | "skipped"
}

interface AnalysisAudit {
  completedAt?: string      // ISO timestamp
  lensesRun: LensEntry[]
}

interface Props {
  audit: AnalysisAudit | null
}

// Friendly label map for agent IDs
const LENS_LABELS: Record<string, string> = {
  vision:    "Food recognition",
  nutrition: "Nutrition analysis",
  clinical:  "Clinical review",
  drug:      "Medication safety check",
  glucose:   "Glucose pattern analysis",
  alerts:    "Risk monitoring",
}

export function AnalysisAuditFooter({ audit }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!audit) return null

  const completed = audit.lensesRun.filter((l) => l.status === "completed")
  const lensCount = completed.length

  if (lensCount === 0) return null

  const timeLabel = audit.completedAt
    ? new Date(audit.completedAt).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="mt-3 border-t border-gl-stone-100 pt-3">
      {/* Collapsed summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-center group"
        aria-expanded={expanded}
      >
        <p className="text-[11px] text-gl-stone-400 tracking-wide group-hover:text-gl-stone-500 transition-colors">
          Analysed through{" "}
          <span className="font-semibold text-gl-stone-500">{lensCount} clinical lenses</span>
          {timeLabel && ` · ${timeLabel}`}
          <span className="ml-1.5 text-gl-stone-300">{expanded ? "▲" : "▼"}</span>
        </p>
      </button>

      {/* Expanded audit receipt */}
      {expanded && (
        <div className="mt-3 space-y-2 overflow-hidden animate-in">
          <p className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-widest mb-2">
            Analysis Receipt
          </p>
          {completed.map((lens) => (
            <div key={lens.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="6" fill="#D8E4D6" />
                  <polyline
                    points="3.5,6 5,7.5 8.5,4"
                    stroke="#2D5F3F"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="text-[11px] text-gl-stone-500">
                  {LENS_LABELS[lens.id] ?? lens.label}
                </span>
              </div>
              <span className="text-[10px] text-gl-stone-300 uppercase tracking-wide">
                Agent {AGENT_STAGES.findIndex((s) => s.id === lens.id) + 1}
              </span>
            </div>
          ))}

          {/* Skipped agents */}
          {audit.lensesRun.filter((l) => l.status === "skipped").map((lens) => (
            <div key={lens.id} className="flex items-center justify-between opacity-40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-gl-stone-200 inline-block" />
                <span className="text-[11px] text-gl-stone-400">
                  {LENS_LABELS[lens.id] ?? lens.label}
                </span>
              </div>
              <span className="text-[10px] text-gl-stone-300">Skipped</span>
            </div>
          ))}

          <p className="text-[9px] text-gl-stone-200 uppercase tracking-widest pt-2 border-t border-gl-stone-100">
            MOH CPG T2DM 2020 · GlucoLens Multi-Agent System
          </p>
        </div>
      )}
    </div>
  )
}
