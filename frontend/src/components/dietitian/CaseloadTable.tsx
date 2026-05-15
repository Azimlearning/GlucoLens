import clsx from "clsx"
import { useState } from "react"
import type { PatientProfile } from "@/lib/types"

interface CaseloadTableProps {
  patients: PatientProfile[]
  onSelect: (p: PatientProfile) => void
}

export function CaseloadTable({ patients, onSelect }: CaseloadTableProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null)

  const sorted = [...patients].sort((a, b) => b.hba1c_percent - a.hba1c_percent)

  const handleSelect = (p: PatientProfile) => {
    setSelectedUid(p.uid)
    onSelect(p)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Name</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Age</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">HbA1c</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">BMI</th>
            <th className="pb-2 font-medium text-slate-500 text-xs whitespace-nowrap">Medications</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((p) => (
            <tr
              key={p.uid}
              onClick={() => handleSelect(p)}
              className={clsx(
                "cursor-pointer transition-colors",
                selectedUid === p.uid ? "bg-slate-100" : "hover:bg-slate-50"
              )}
            >
              <td className="py-2 pr-4 font-medium text-slate-800 whitespace-nowrap">{p.name}</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{p.age}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                <span className={clsx("font-semibold", p.hba1c_percent >= 7.5 ? "text-red-600" : p.hba1c_percent >= 6.5 ? "text-amber-600" : "text-emerald-600")}>
                  {p.hba1c_percent}%
                </span>
              </td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{p.bmi}</td>
              <td className="py-2 text-slate-500 text-xs">
                {p.medications.length > 0 ? p.medications.join(", ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
