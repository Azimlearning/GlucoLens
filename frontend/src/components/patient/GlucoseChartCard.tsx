import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentGlucose } from "@/hooks/usePatientData"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts"
import type { GlucoseReading } from "@/lib/types"

// MOH CPG T2DM 2020 targets
const POPULATION_AVG_MMOL = 8.0
const POST_MEAL_TARGET = 10.0
const FASTING_TARGET = 7.0

// GL palette hex values for Recharts (needs raw hex, not Tailwind classes)
const GL_SAFFRON = "#C8893A"
const GL_STONE_200 = "#D6CDBB"
const GL_STONE_400 = "#8E8470"
const GL_AMBER = "#B7791F"
const GL_RED = "#A33B2A"
const GL_GREEN = "#2D5F3F"

function formatLabel(timestamp: string): string {
  const d = new Date(timestamp)
  const day = d.toLocaleDateString("en-MY", { weekday: "short" })
  const time = d.toLocaleTimeString("en-MY", { hour: "numeric", hour12: true })
  return `${day} ${time}`
}

function buildChartData(readings: GlucoseReading[], personalBaseline: number) {
  return [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((r) => ({
      label: formatLabel(r.timestamp),
      You: parseFloat(r.value_mmol.toFixed(1)),
      "T2DM Target": FASTING_TARGET,
      "Post-meal Limit": POST_MEAL_TARGET,
      "Your Baseline": parseFloat(personalBaseline.toFixed(1)),
    }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const you = payload.find((p: any) => p.dataKey === "You")
  const baseline = payload.find((p: any) => p.dataKey === "Your Baseline")
  if (!you) return null
  const delta = you.value - (baseline?.value ?? FASTING_TARGET)
  const above = delta > 0
  return (
    <div className="bg-gl-bg-elev border border-gl-stone-100 rounded-md px-3 py-2.5 shadow-gl-sm text-xs space-y-1">
      <p className="font-semibold text-gl-ink">{label}</p>
      <p className="font-semibold font-mono-gl" style={{ color: GL_SAFFRON }}>{you.value} mmol/L</p>
      {baseline && (
        <p style={{ color: above ? GL_RED : GL_GREEN }}>
          {above ? "+" : ""}{delta.toFixed(1)} vs your {baseline.value} baseline
        </p>
      )}
    </div>
  )
}

interface Props { uid: string }

export function GlucoseChartCard({ uid }: Props) {
  const { readings, loading } = useRecentGlucose(uid, 30)

  // Derive a personal rolling baseline: median of all fetched readings
  const sorted = [...readings].sort((a, b) => a.value_mmol - b.value_mmol)
  const mid = Math.floor(sorted.length / 2)
  const personalBaseline = sorted.length
    ? sorted.length % 2 === 0
      ? (sorted[mid - 1].value_mmol + sorted[mid].value_mmol) / 2
      : sorted[mid].value_mmol
    : FASTING_TARGET

  if (loading) {
    return (
      <Card>
        <h2 className="text-h4 font-semibold text-gl-ink mb-1">Glucose Response</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }

  if (readings.length === 0) {
    return (
      <Card>
        <h2 className="text-h4 font-semibold text-gl-ink mb-1">Glucose Response</h2>
        <p className="text-sm text-gl-stone-400 text-center py-8">No glucose readings yet. Readings will appear here after your first meal is logged.</p>
      </Card>
    )
  }

  const chartData = buildChartData(readings, personalBaseline)
  const userAvg = readings.reduce((s, r) => s + r.value_mmol, 0) / readings.length
  const deltaPct = (userAvg - FASTING_TARGET) / FASTING_TARGET * 100
  const above = deltaPct > 0
  const maxVal = Math.max(...readings.map((r) => r.value_mmol), POST_MEAL_TARGET + 1)

  return (
    <Card>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-h4 font-semibold text-gl-ink">Glucose Response</h2>
          <p className="text-xs text-gl-stone-400 mt-0.5">Your readings vs Malaysian T2DM population</p>
        </div>
        {/* Saffron curve icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polyline points="3,18 7,12 11,15 15,8 19,11 21,7" stroke={GL_SAFFRON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="21" cy="7" r="2" fill={GL_SAFFRON} />
        </svg>
      </div>

      {/* Delta badge */}
      <div
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 mb-4 text-xs font-semibold"
        style={{
          background: above ? "#ECCEC4" : "#D8E4D6",
          color: above ? GL_RED : GL_GREEN,
        }}
      >
        <span>{above ? "▲" : "▼"}</span>
        <span className="font-mono-gl">
          {userAvg.toFixed(1)} mmol/L · {above ? "+" : ""}{deltaPct.toFixed(0)}% vs fasting target ({FASTING_TARGET} mmol/L)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: GL_STONE_400 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[3, Math.ceil(maxVal + 0.5)]}
            tick={{ fontSize: 9, fill: GL_STONE_400 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: GL_STONE_400 }}>{value}</span>}
          />
          <ReferenceLine
            y={POST_MEAL_TARGET}
            stroke={GL_AMBER}
            strokeDasharray="4 2"
            label={{ value: "Post-meal limit", fontSize: 8, fill: GL_AMBER, position: "right" }}
          />
          <ReferenceLine
            y={FASTING_TARGET}
            stroke={GL_STONE_400}
            strokeDasharray="3 3"
            label={{ value: "Fasting target", fontSize: 8, fill: GL_STONE_400, position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="Your Baseline"
            stroke={GL_STONE_200}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="You"
            stroke={GL_SAFFRON}
            strokeWidth={2}
            dot={{ r: 3, fill: GL_SAFFRON, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: GL_SAFFRON }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gl-stone-300 text-center mt-2">
        Based on MOH CPG T2DM 2020 · Last {readings.length} readings · Baseline: {personalBaseline.toFixed(1)} mmol/L
      </p>
    </Card>
  )
}
