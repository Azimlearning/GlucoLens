/**
 * GlucoseSummaryChart — Static informative breakdown of glucose data.
 * Complements the live LineChart with:
 *  - Key stats row (avg / min / max / time-in-range)
 *  - 7-day daily average bar chart (colour-coded by zone)
 *  - Time-of-day average bar chart
 *  - Zone distribution donut + table
 *  - Time-in-range progress bar
 */
import { Card } from "@/components/shared/Card"
import { Spinner } from "@/components/shared/Spinner"
import { useRecentGlucose } from "@/hooks/usePatientData"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, PieChart, Pie,
} from "recharts"
import type { GlucoseReading } from "@/lib/types"

// MOH CPG T2DM 2020 thresholds (mmol/L)
const HYPO_LIMIT = 4.0
const NORMAL_MAX = 7.0   // fasting upper
const PRE_HIGH_MAX = 10.0  // post-meal upper (2hr)

const GL_SAFFRON = "#C8893A"
const GL_GREEN = "#2D5F3F"
const GL_GREEN_BG = "#D8E4D6"
const GL_AMBER = "#B7791F"
const GL_AMBER_BG = "#F5E2C0"
const GL_RED = "#A33B2A"
const GL_RED_BG = "#ECCEC4"
const GL_STONE_400 = "#8E8470"
const GL_STONE_50 = "#F7F5F1"

type Zone = "Hypo" | "Normal" | "Pre-High" | "High"

function classifyZone(v: number): Zone {
  if (v < HYPO_LIMIT) return "Hypo"
  if (v < NORMAL_MAX) return "Normal"
  if (v < PRE_HIGH_MAX) return "Pre-High"
  return "High"
}

const ZONE_COLOR: Record<Zone, string> = {
  "Hypo": GL_RED,
  "Normal": GL_GREEN,
  "Pre-High": GL_AMBER,
  "High": GL_RED,
}
const ZONE_BG: Record<Zone, string> = {
  "Hypo": GL_RED_BG,
  "Normal": GL_GREEN_BG,
  "Pre-High": GL_AMBER_BG,
  "High": GL_RED_BG,
}

type Slot = "Night\n12–6am" | "Morning\n6–12pm" | "Afternoon\n12–6pm" | "Evening\n6–12am"
const SLOT_ORDER: Slot[] = ["Night\n12–6am", "Morning\n6–12pm", "Afternoon\n12–6pm", "Evening\n6–12am"]
const SLOT_SHORT: Record<Slot, string> = {
  "Night\n12–6am": "Night",
  "Morning\n6–12pm": "Morning",
  "Afternoon\n12–6pm": "Afternoon",
  "Evening\n6–12am": "Evening",
}

function getSlot(ts: string): Slot {
  const h = new Date(ts).getHours()
  if (h < 6) return "Night\n12–6am"
  if (h < 12) return "Morning\n6–12pm"
  if (h < 18) return "Afternoon\n12–6pm"
  return "Evening\n6–12am"
}

function buildTrend(readings: GlucoseReading[]) {
  const byDay: Record<string, number[]> = {}
  readings.forEach((r) => {
    const d = new Date(r.timestamp)
    const key = d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric" })
      ; (byDay[key] ??= []).push(r.value_mmol)
  })
  return Object.entries(byDay).slice(-7).map(([day, vals]) => ({
    day,
    avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
  }))
}

function buildTimeOfDay(readings: GlucoseReading[]) {
  const map: Record<Slot, number[]> = {
    "Night\n12–6am": [], "Morning\n6–12pm": [],
    "Afternoon\n12–6pm": [], "Evening\n6–12am": [],
  }
  readings.forEach((r) => map[getSlot(r.timestamp)].push(r.value_mmol))
  return SLOT_ORDER.filter((s) => map[s].length > 0).map((s) => ({
    slot: SLOT_SHORT[s],
    avg: parseFloat((map[s].reduce((a, b) => a + b, 0) / map[s].length).toFixed(1)),
    n: map[s].length,
  }))
}

function buildZones(readings: GlucoseReading[]) {
  const counts: Record<Zone, number> = { Hypo: 0, Normal: 0, "Pre-High": 0, High: 0 }
  readings.forEach((r) => counts[classifyZone(r.value_mmol)]++)
  return (["Normal", "Pre-High", "High", "Hypo"] as Zone[])
    .map((z) => ({ name: z, value: counts[z], color: ZONE_COLOR[z], bg: ZONE_BG[z] }))
    .filter((d) => d.value > 0)
}

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0].value as number
  const zone = classifyZone(v)
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: "#3D3529" }}>{label}</div>
      <div style={{ color: ZONE_COLOR[zone], fontWeight: 700 }}>{v} mmol/L</div>
      <div style={{ color: ZONE_COLOR[zone] }}>{zone}</div>
    </div>
  )
}

function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg }} className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 flex-1 min-w-0">
      <span className="text-[10px] font-medium truncate w-full text-center" style={{ color }}>{label}</span>
      <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

interface Props { uid: string }

export function GlucoseSummaryChart({ uid }: Props) {
  const { readings, loading } = useRecentGlucose(uid, 30)

  if (loading) {
    return (
      <Card>
        <h2 className="text-h4 font-semibold text-gl-ink mb-1">Glucose Breakdown</h2>
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    )
  }
  if (readings.length === 0) return null

  const vals = readings.map((r) => r.value_mmol)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const inRange = readings.filter((r) => r.value_mmol >= NORMAL_MAX && r.value_mmol < PRE_HIGH_MAX).length
  const tir = Math.round((inRange / readings.length) * 100)

  const tirColor = tir >= 70 ? GL_GREEN : tir >= 50 ? GL_AMBER : GL_RED
  const tirBg = tir >= 70 ? GL_GREEN_BG : tir >= 50 ? GL_AMBER_BG : GL_RED_BG

  const trend = buildTrend(readings)
  const timeDay = buildTimeOfDay(readings)
  const zones = buildZones(readings)
  const domMax = Math.ceil(maxV + 1)

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-h4 font-semibold text-gl-ink">Glucose Breakdown</h2>
          <p className="text-xs text-gl-stone-400 mt-0.5">Summary · Last {readings.length} readings</p>
        </div>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="1" y="11" width="4" height="10" rx="1" fill={GL_SAFFRON} opacity="0.4" />
          <rect x="8" y="6" width="4" height="15" rx="1" fill={GL_SAFFRON} opacity="0.7" />
          <rect x="15" y="2" width="4" height="19" rx="1" fill={GL_SAFFRON} />
        </svg>
      </div>

      {/* Stats pills */}
      <div className="flex gap-1.5 mb-5">
        <StatPill label="Avg" value={`${avg.toFixed(1)}`} color={GL_STONE_400} bg={GL_STONE_50} />
        <StatPill label="Min" value={`${minV.toFixed(1)}`} color={GL_GREEN} bg={GL_GREEN_BG} />
        <StatPill label="Max" value={`${maxV.toFixed(1)}`} color={GL_RED} bg={GL_RED_BG} />
        <StatPill label="In Range" value={`${tir}%`} color={tirColor} bg={tirBg} />
      </div>

      {/* 7-Day trend bar chart */}
      <p className="text-[10px] font-semibold text-gl-stone-400 mb-1.5 uppercase tracking-wide">Daily Average (Last 7 Days)</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="28%">
          <XAxis dataKey="day" tick={{ fontSize: 8, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
          <YAxis domain={[3, domMax]} tick={{ fontSize: 8, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
          <Tooltip content={<BarTip />} />
          <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
            {trend.map((d, i) => <Cell key={i} fill={ZONE_COLOR[classifyZone(d.avg)]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Zone colour legend */}
      <div className="flex items-center gap-3 justify-center flex-wrap mt-1 mb-5">
        {(["Normal", "Pre-High", "High"] as Zone[]).map((z) => (
          <span key={z} className="flex items-center gap-1 text-[9px]" style={{ color: ZONE_COLOR[z] }}>
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: ZONE_COLOR[z] }} />
            {z}{z === "Normal" ? " (<7)" : z === "Pre-High" ? " (7–10)" : " (>10)"} mmol/L
          </span>
        ))}
      </div>

      {/* Time-of-day breakdown */}
      {timeDay.length > 1 && (
        <>
          <p className="text-[10px] font-semibold text-gl-stone-400 mb-1.5 uppercase tracking-wide">Average by Time of Day</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={timeDay} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
              <XAxis dataKey="slot" tick={{ fontSize: 8, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
              <YAxis domain={[3, domMax]} tick={{ fontSize: 8, fill: GL_STONE_400 }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
                {timeDay.map((d, i) => <Cell key={i} fill={ZONE_COLOR[classifyZone(d.avg)]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mb-5" />
        </>
      )}

      {/* Zone distribution donut + table */}
      <p className="text-[10px] font-semibold text-gl-stone-400 mb-2 uppercase tracking-wide">Reading Distribution</p>
      <div className="flex items-center gap-3">
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie data={zones} cx="50%" cy="50%" innerRadius={26} outerRadius={48} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {zones.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 flex-1">
          {zones.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-gl-stone-500">{d.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold font-mono" style={{ color: d.color }}>{d.value}</span>
                <span className="text-[10px] text-gl-stone-300">
                  ({Math.round((d.value / readings.length) * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time in Range progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-gl-stone-400">Time in Range (7–10 mmol/L)</span>
          <span className="font-semibold" style={{ color: tirColor }}>{tir}%</span>
        </div>
        <div className="h-2 rounded-full bg-gl-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${tir}%`, background: tirColor, transition: "width 0.6s ease" }}
          />
        </div>
        <p className="text-[9px] text-gl-stone-300 mt-1 text-right">Target: ≥70% · MOH CPG T2DM 2020</p>
      </div>

      {/* Agent attribution */}
      <p className="text-[10px] text-gl-stone-300 uppercase tracking-widest mt-3">Glucose pattern analysis · Agent 4</p>
    </Card>
  )
}
