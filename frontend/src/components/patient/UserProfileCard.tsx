import { useState } from "react"
import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { usePatientProfile } from "@/hooks/usePatientProfile"

interface Props {
  uid: string
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-700 text-right">{String(value)}</span>
    </div>
  )
}

function HbA1cBadge({ value }: { value: number }) {
  const [cls, label] = value >= 8
    ? ["bg-red-100 text-red-700", "High — review needed"]
    : value >= 6.5
      ? ["bg-amber-100 text-amber-700", "Monitoring"]
      : ["bg-emerald-100 text-emerald-700", "Good control"]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      HbA1c {value}% — {label}
    </span>
  )
}

export function UserProfileCard({ uid }: Props) {
  const { profile, loading } = usePatientProfile(uid)
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-base font-semibold text-slate-800">My Profile</h2>
        <span className="text-slate-400 text-xs">{expanded ? "▲ Hide" : "▼ View"}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : !profile ? (
            <p className="text-sm text-slate-400 text-center py-4">Profile not set up yet</p>
          ) : (
            <div className="space-y-4">
              {/* HbA1c banner */}
              {profile.hba1c_percent && (
                <HbA1cBadge value={profile.hba1c_percent} />
              )}

              {/* Body metrics */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Body Metrics</p>
                <div className="bg-slate-50 rounded-xl px-3 py-1">
                  <InfoRow label="Age" value={profile.age ? `${profile.age} years` : undefined} />
                  <InfoRow label="Gender" value={profile.gender} />
                  <InfoRow label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : undefined} />
                  <InfoRow label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : undefined} />
                  <InfoRow label="BMI" value={profile.bmi ? `${profile.bmi.toFixed(1)}` : undefined} />
                </div>
              </div>

              {/* Daily targets */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Targets</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-slate-400">Calories</p>
                    <p className="text-sm font-bold text-slate-800">{profile.daily_calorie_target ?? 1800}</p>
                    <p className="text-xs text-slate-400">kcal/day</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-slate-400">Carbohydrates</p>
                    <p className="text-sm font-bold text-slate-800">{profile.daily_carb_target_g ?? 130}</p>
                    <p className="text-xs text-slate-400">g/day</p>
                  </div>
                </div>
              </div>

              {/* Medications */}
              {profile.medications && profile.medications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current Medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.medications.map((med, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full">
                        {typeof med === "string" ? med : (med as any).name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Interactions are checked automatically when you log a meal.
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-slate-300 text-center pt-1">
                Profile managed by your dietitian · Contact them to update
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
