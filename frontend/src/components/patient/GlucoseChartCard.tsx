import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentGlucose } from "@/hooks/usePatientData"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts"
import type { GlucoseReading } from "@/lib/types"

// MOH CPG T2DM 2020: post-meal target <10.0, population avg ~8.0 mmol/L for T2DM
const POPULATION_AVG_MMOL = 8.0
const POST_MEAL_TARGET    = 10.0
const FASTING_TARGET      = 7.0

function formatLabel(timestamp: string): string {
  const d = new Date(timestamp)
  const day  = d.toLocaleDateString("en-MY", { weekday: "short" })
  const time = d.toLocaleTimeString("en-MY", { hour: "numeric", hour12: true })
  return `${day} ${time}`
}

function buildChartData(readings: GlucoseReading[]) {
  return [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((r) => ({
      label:     formatLabel(r.timestamp),
      You:       parseFloat(r.value_mmol.toFixed(1)),
      "Avg T2D": POPULATION_AVG_MMOL,
    }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const you = payload.find((p: any) => p.dataKey === "You")
  if (!you) return null
  const delta = ((you.value - POPULATION_AVG_MMOL) / POPULATION_AVG_MMOL * 100).toFixed(0)
  const above = you.value > POPULATION_AVG_MMOL
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-brand-600 font-medium">{you.value} mmol/L</p>
      <p className={above ? "text-red-500" : "text-emerald-600"}>
        {above ? "+" : ""}{delta}% vs population avg
      </p>
    </div>
  )
}

interface Props {
  uid: string
}

export function GlucoseChartCard({ uid }: Props) {
  const { readings, loading } = useRecentGlucose(uid, 30)

  if (loading) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Glucose Response</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }

  if (readings.length === 0) return null

  const chartData = buildChartData(readings)
  const userAvg   = readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length
  const deltaPct  = ((userAvg - POPULATION_AVG_MMOL) / POPULATION_AVG_MMOL * 100)
  const above     = deltaPct > 0
  const maxVal    = Math.max(...readings.map((r) => r.value_mmol), POST_MEAL_TARGET + 1)

  return (
    <Card>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Glucose Response</h2>
          <p className="text-xs text-slate-400 mt-0.5">Your readings vs Malaysian T2DM population</p>
        </div>
        <span className="text-2xl">📈</span>
      </div>

      {/* Delta badge */}
      <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 mb-4 text-xs font-semibold ${
        above ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}>
        <span>{above ? "▲" : "▼"}</span>
        <span>
          Your avg {userAvg.toFixed(1)} mmol/L · {above ? "+" : ""}{deltaPct.toFixed(0)}% vs population avg ({POPULATION_AVG_MMOL} mmol/L)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[3, Math.ceil(maxVal + 0.5)]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            formatter={(value) => <span className="text-slate-500">{value}</span>}
          />
          <ReferenceLine
            y={POST_MEAL_TARGET}
            stroke="#f59e0b"
            strokeDasharray="4 2"
            label={{ value: "Post-meal limit", fontSize: 8, fill: "#f59e0b", position: "right" }}
          />
          <ReferenceLine
            y={FASTING_TARGET}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{ value: "Fasting target", fontSize: 8, fill: "#94a3b8", position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="Avg T2D"
            stroke="#cbd5e1"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="You"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-300 text-center mt-2">
        Based on MOH CPG T2DM 2020 · Last {readings.length} readings
      </p>
    </Card>
  )
}
