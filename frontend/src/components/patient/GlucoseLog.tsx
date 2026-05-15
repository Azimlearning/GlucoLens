import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/shared/Button"
import { Card } from "@/components/shared/Card"
import { useRecentGlucose } from "@/hooks/usePatientData"
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"
import { useAuth } from "@/contexts/AuthContext"

export function GlucoseLog() {
  const { user } = useAuth()
  const { readings, loading } = useRecentGlucose(user?.uid ?? "")
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleLog = async () => {
    const mmol = parseFloat(value)
    if (isNaN(mmol) || mmol < 1 || mmol > 30) {
      setError("Enter a value between 1.0 and 30.0 mmol/L")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await api.logGlucose(mmol)
      setValue("")
    } catch {
      setError("Failed to log reading")
    } finally {
      setSubmitting(false)
    }
  }

  const chartData = [...readings].reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleDateString("en-MY", { month: "short", day: "numeric" }),
    value: r.value_mmol,
  }))

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Blood Glucose</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          step="0.1"
          min="1"
          max="30"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 6.5"
          aria-label="Glucose reading in mmol/L"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="self-center text-sm text-slate-500">mmol/L</span>
        <Button onClick={handleLog} loading={submitting} variant="primary">Log</Button>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis domain={[3, 15]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} mmol/L`, "Glucose"]} />
            <ReferenceLine y={7.8} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Target", fontSize: 10 }} />
            <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Hypo", fontSize: 10 }} />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
