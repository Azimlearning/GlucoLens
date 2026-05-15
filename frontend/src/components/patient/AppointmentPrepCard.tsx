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
}

interface MeetingPlan {
  patient_name: string
  generated_at: string
  meeting_date_suggestion: string
  priority: "routine" | "urgent" | "critical"
  duration_min: number
  agenda_items: AgendaItem[]
  key_concerns: string[]
  recommended_actions: string[]
  follow_up_interval_weeks: number
}

const PRIORITY_STYLE: Record<string, string> = {
  routine:  "bg-emerald-100 text-emerald-700",
  urgent:   "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
}

export function AppointmentPrepCard({ uid }: { uid: string }) {
  const [plan, setPlan] = useState<MeetingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [openItem, setOpenItem] = useState<number | null>(null)

  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      const { data } = await api.getMeetingPlan(uid)
      if (data.success) {
        setPlan(data.meeting_plan)
        setOpenItem(null)
      } else {
        setError("Could not generate plan. Please try again.")
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to generate plan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Appointment Prep</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Know what your dietitian will discuss next session
          </p>
        </div>
        <span className="text-2xl">📅</span>
      </div>

      {!plan && !loading && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4 text-center">
          <p className="text-xs text-slate-500 mb-3">
            Generate a personalised agenda based on your recent meals, glucose readings, and clinical history.
          </p>
          <Button onClick={generate} className="w-full">Generate My Meeting Agenda</Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner />
          <p className="text-sm text-slate-500">Analysing your clinical data…</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {plan && !loading && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PRIORITY_STYLE[plan.priority]}`}>
              {plan.priority} priority
            </span>
            <span className="text-xs text-slate-500">
              Suggested: <strong className="text-slate-700">{plan.meeting_date_suggestion}</strong>
            </span>
            <span className="text-xs text-slate-500">
              Est. <strong className="text-slate-700">{plan.duration_min} min</strong>
            </span>
          </div>

          {/* Key concerns */}
          {plan.key_concerns.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">Your dietitian will focus on:</p>
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
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Session Agenda</p>
            <div className="space-y-1.5">
              {plan.agenda_items.map((item) => (
                <div key={item.order} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setOpenItem(openItem === item.order ? null : item.order)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {item.order}
                      </span>
                      <span className="text-xs font-medium text-slate-800 truncate">{item.topic}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{item.duration_min}m</span>
                  </button>
                  {openItem === item.order && (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2 bg-slate-50">
                      <ul className="space-y-1">
                        {item.talking_points.map((pt, i) => (
                          <li key={i} className="text-xs text-slate-600 flex gap-2">
                            <span className="text-brand-400 shrink-0">→</span>{pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {plan.recommended_actions.length > 0 && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
              <p className="text-xs font-semibold text-brand-700 mb-1.5">To prepare, try to:</p>
              <ul className="space-y-1">
                {plan.recommended_actions.map((a, i) => (
                  <li key={i} className="text-xs text-slate-700 flex gap-2">
                    <span className="text-emerald-500 shrink-0">✓</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <p className="text-xs text-slate-300">
              Follow-up every {plan.follow_up_interval_weeks} weeks
            </p>
            <button
              onClick={generate}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
