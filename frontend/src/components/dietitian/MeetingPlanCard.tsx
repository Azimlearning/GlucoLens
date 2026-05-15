import { useState } from "react"
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { Spinner } from "@/components/shared/Spinner"
import { api } from "@/lib/api"

interface AgendaItem {
  order: number
  topic: string
  duration_min: number
  talking_points: string[]
  clinical_basis: string
}

interface DietaryTarget {
  nutrient: string
  current_avg: number
  target: number
  unit: string
  status: "over" | "under" | "on_target"
}

interface MeetingPlan {
  patient_name: string
  generated_at: string
  meeting_date_suggestion: string
  priority: "routine" | "urgent" | "critical"
  duration_min: number
  agenda_items: AgendaItem[]
  key_concerns: string[]
  dietary_targets_to_review: DietaryTarget[]
  recommended_actions: string[]
  follow_up_interval_weeks: number
}

const PRIORITY_STYLE: Record<string, string> = {
  routine:  "bg-emerald-100 text-emerald-700",
  urgent:   "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
}

const STATUS_STYLE: Record<string, string> = {
  over:      "text-red-600",
  under:     "text-amber-600",
  on_target: "text-emerald-600",
}

function StatusBadge({ status }: { status: string }) {
  const [icon, label] = status === "over"
    ? ["↑", "Over target"]
    : status === "under"
      ? ["↓", "Under target"]
      : ["✓", "On target"]
  return (
    <span className={`text-xs font-medium ${STATUS_STYLE[status] ?? "text-slate-500"}`}>
      {icon} {label}
    </span>
  )
}

export function MeetingPlanCard({ patientId }: { patientId: string }) {
  const [plan, setPlan] = useState<MeetingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [openItem, setOpenItem] = useState<number | null>(null)

  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      const { data } = await api.getMeetingPlan(patientId)
      if (data.success) {
        setPlan(data.meeting_plan)
        setOpenItem(null)
      } else {
        setError("Failed to generate meeting plan.")
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to generate meeting plan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Meeting Planner</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            AI-generated clinical agenda · MOH CPG T2DM 2020 · MDG 2020 · PDM
          </p>
        </div>
        <Button variant="primary" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : plan ? "Regenerate" : "Generate Plan"}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
          <p className="ml-3 text-sm text-slate-500">Analysing patient data…</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {plan && !loading && (
        <div className="space-y-5 mt-2">
          {/* Header */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${PRIORITY_STYLE[plan.priority]}`}>
              {plan.priority}
            </span>
            <span className="text-xs text-slate-500">
              Suggested: <strong className="text-slate-700">{plan.meeting_date_suggestion}</strong>
            </span>
            <span className="text-xs text-slate-500">
              Duration: <strong className="text-slate-700">{plan.duration_min} min</strong>
            </span>
            <span className="text-xs text-slate-500">
              Follow-up: <strong className="text-slate-700">every {plan.follow_up_interval_weeks} weeks</strong>
            </span>
          </div>

          {/* Key concerns */}
          {plan.key_concerns.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">Key Clinical Concerns</p>
              <ul className="space-y-1">
                {plan.key_concerns.map((c, i) => (
                  <li key={i} className="text-xs text-amber-800 flex gap-2">
                    <span className="shrink-0">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Agenda */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Meeting Agenda</p>
            <div className="space-y-2">
              {plan.agenda_items.map((item) => (
                <div key={item.order} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setOpenItem(openItem === item.order ? null : item.order)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {item.order}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{item.topic}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{item.duration_min} min</span>
                  </button>
                  {openItem === item.order && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2">
                      <ul className="space-y-1">
                        {item.talking_points.map((pt, i) => (
                          <li key={i} className="text-xs text-slate-700 flex gap-2">
                            <span className="text-brand-400 shrink-0">→</span>{pt}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-slate-400 italic">Basis: {item.clinical_basis}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dietary targets */}
          {plan.dietary_targets_to_review.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Dietary Targets Review</p>
              <div className="space-y-2">
                {plan.dietary_targets_to_review.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                    <span className="text-xs font-medium text-slate-700 capitalize">{t.nutrient}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Avg: <b className="text-slate-700">{t.current_avg}{t.unit}</b></span>
                      <span>Target: <b>{t.target}{t.unit}</b></span>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended actions */}
          {plan.recommended_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Recommended Actions</p>
              <ul className="space-y-1.5">
                {plan.recommended_actions.map((action, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-700">
                    <span className="text-emerald-500 shrink-0">✓</span>{action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-300 text-center pt-2 border-t border-slate-100">
            Generated {new Date(plan.generated_at).toLocaleString("en-MY")} · Based on clinical guidelines
          </p>
        </div>
      )}
    </Card>
  )
}
