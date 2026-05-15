import { Card } from "@/components/shared/Card"
import { Badge } from "@/components/shared/Badge"
import type { PatientProfile } from "@/lib/types"

interface PatientCardProps {
  patient: PatientProfile
  onClick: () => void
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const hba1cColor = patient.hba1c_percent > 8
    ? "text-gl-red   bg-gl-red-soft   border-transparent"
    : patient.hba1c_percent > 7
    ? "text-gl-amber bg-gl-amber-soft border-transparent"
    : "text-gl-green bg-gl-green-soft border-transparent"
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="hover:shadow-gl transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gl-ink">{patient.name}</p>
            <p className="text-sm text-gl-stone-400">{patient.age}y · BMI {patient.bmi}</p>
            <p className="text-xs text-gl-stone-400 mt-1">{patient.medications.join(", ")}</p>
          </div>
          <Badge label={`HbA1c ${patient.hba1c_percent}%`} className={hba1cColor} />
        </div>
      </Card>
    </button>
  )
}
