import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { usePatientProfile } from "@/hooks/usePatientProfile"

interface Props {
  uid: string
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gl-stone-100 last:border-0">
      <span className="text-xs text-gl-stone-400 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-gl-ink text-right">{String(value)}</span>
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
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>
      HbA1c {value}% — {label}
    </span>
  )
}

/** Circular ring showing HbA1c vs 6.5% target */
function HbA1cRing({ value }: { value: number }) {
  const max   = 12
  const pct   = Math.min(value, max) / max
  const r     = 40
  const circ  = 2 * Math.PI * r
  const dash  = circ * pct
  const color = value >= 8 ? "#A33B2A" : value >= 6.5 ? "#B7791F" : "#2D5F3F"
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EAE5DC" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>{value}%</text>
        <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#8E8470">HbA1c</text>
      </svg>
      <p className="text-[10px] text-gl-stone-400">Target: ≤6.5%</p>
    </div>
  )
}

function BmiBar({ bmi }: { bmi: number }) {
  const label = bmi < 18.5 ? "Underweight"
    : bmi < 25 ? "Normal"
    : bmi < 30 ? "Overweight"
    : "Obese"
  const pct  = Math.min((bmi / 40) * 100, 100)
  const color = bmi < 18.5 ? "#3B82F6"
    : bmi < 25 ? "#2D5F3F"
    : bmi < 30 ? "#B7791F"
    : "#A33B2A"
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-gl-stone-400">BMI</span>
        <span className="font-bold" style={{ color }}>{bmi.toFixed(1)} — {label}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gl-stone-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-gl-stone-300 mt-0.5">
        <span>Under</span><span>Normal</span><span>Overweight</span><span>Obese</span>
      </div>
    </div>
  )
}

export function UserProfileCard({ uid }: Props) {
  const { profile, loading } = usePatientProfile(uid)

  return (
    <Card>
      <h2 className="text-base font-semibold text-gl-ink mb-4">My Profile</h2>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !profile ? (
        <p className="text-sm text-gl-stone-400 text-center py-6">Profile not set up yet</p>
      ) : (
        <div className="space-y-5">

          {/* HbA1c ring + badge */}
          <div className="flex items-center gap-4">
            {profile.hba1c_percent && <HbA1cRing value={profile.hba1c_percent} />}
            <div className="flex-1 space-y-2">
              {profile.hba1c_percent && <HbA1cBadge value={profile.hba1c_percent} />}
              <p className="text-[11px] text-gl-stone-400 leading-relaxed">
                Your HbA1c is reviewed at every dietitian visit. Keep tracking meals to help lower it.
              </p>
            </div>
          </div>

          {/* Body metrics */}
          <div>
            <p className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-wide mb-2">Body Metrics</p>
            <div className="bg-gl-stone-50 rounded-xl px-3 py-1 border border-gl-stone-100">
              <InfoRow label="Age"    value={profile.age ? `${profile.age} years` : undefined} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : undefined} />
              <InfoRow label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : undefined} />
            </div>
          </div>

          {/* BMI visual bar */}
          {profile.bmi && (
            <div className="bg-gl-stone-50 rounded-xl px-3 py-3 border border-gl-stone-100">
              <BmiBar bmi={profile.bmi} />
            </div>
          )}

          {/* Daily targets */}
          <div>
            <p className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-wide mb-2">Daily Targets</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-brand-400 uppercase tracking-wide">Calories</p>
                <p className="text-lg font-bold text-brand-700 font-mono">{profile.daily_calorie_target ?? 1800}</p>
                <p className="text-[10px] text-brand-400">kcal/day</p>
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-brand-400 uppercase tracking-wide">Carbohydrates</p>
                <p className="text-lg font-bold text-brand-700 font-mono">{profile.daily_carb_target_g ?? 130}</p>
                <p className="text-[10px] text-brand-400">g/day</p>
              </div>
            </div>
          </div>

          {/* Medications */}
          {profile.medications && profile.medications.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-wide mb-2">Current Medications</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.medications.map((med, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                    {typeof med === "string" ? med : (med as any).name}
                  </span>
                ))}
              </div>
            </div>
          )}



        </div>
      )}
    </Card>
  )
}
