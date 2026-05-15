/**
 * ToolsTab — Clinical tools accessed occasionally
 * Contains: Health claim checker, Appointment prep,
 * Weekly report download, Drug-Food interaction log
 */
import { useAuth } from "@/contexts/AuthContext"
import { MisinfoChecker } from "./MisinfoChecker"
import { AppointmentPrepCard } from "./AppointmentPrepCard"
import { WeeklyReportCard } from "./WeeklyReportCard"

export function ToolsTab() {
  const { user } = useAuth()
  const uid = user?.uid ?? ""

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="px-1">
        <h2 className="text-sm font-semibold text-gl-ink uppercase tracking-wide">Clinical Tools</h2>
        <p className="text-xs text-gl-stone-400 mt-0.5">
          Evidence-based tools powered by your dietitian&apos;s clinical data
        </p>
      </div>

      <MisinfoChecker />
      <AppointmentPrepCard uid={uid} />
      <WeeklyReportCard />
    </div>
  )
}
