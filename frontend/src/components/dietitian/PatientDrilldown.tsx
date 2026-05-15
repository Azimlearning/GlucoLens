import { Card } from "@/components/shared/Card"
import { TrafficLightBadge } from "@/components/shared/TrafficLight"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentMeals, useRecentGlucose } from "@/hooks/usePatientData"
import type { PatientProfile } from "@/lib/types"

export function PatientDrilldown({ patient }: { patient: PatientProfile }) {
  const { meals, loading: mealsLoading } = useRecentMeals(patient.uid, 7)
  const { readings } = useRecentGlucose(patient.uid, 14)
  const avgGlucose = readings.length
    ? (readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length).toFixed(1)
    : "—"
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">Patient Summary</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "HbA1c", value: patient.hba1c_percent + "%" },
            { label: "BMI", value: String(patient.bmi) },
            { label: "Avg Glucose", value: avgGlucose + " mmol/L" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">Recent Meals</h3>
        {mealsLoading ? <Spinner /> : (
          <ul className="space-y-2">{meals.map((m) => (
            <li key={m.meal_id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{m.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{m.carbs_g}g carbs</span>
                <TrafficLightBadge value={m.traffic_light} />
              </div>
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  )
}