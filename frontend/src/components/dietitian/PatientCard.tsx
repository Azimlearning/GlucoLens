import { Card } from "@/components/shared/Card"
import { Badge } from "@/components/shared/Badge"
import type { PatientProfile } from "@/lib/types"

interface PatientCardProps {
  patient: PatientProfile
  onClick: () => void
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const hba1cColor = patient.hba1c_percent > 8
    ? "text-red-600 bg-red-50 border-red-200"
    : patient.hba1c_percent > 7
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200"
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">{patient.name}</p>
            <p className="text-sm text-slate-500">{patient.age}y · BMI {patient.bmi}</p>
            <p className="text-xs text-slate-400 mt-1">{patient.medications.join(", ")}</p>
          </div>
          <Badge label={`HbA1c ${patient.hba1c_percent}%`} className={hba1cColor} />
        </div>
      </Card>
    </button>
  )
}