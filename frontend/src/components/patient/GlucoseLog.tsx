import { useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/shared/Card"
import { useLiveCGM, MAX_POINTS } from "@/hooks/useLiveCGM"
import { useAuth } from "@/contexts/AuthContext"
import { useRecentMeals } from "@/hooks/usePatientData"

const MIN_Y = 3
const MAX_Y = 15
const PAD = { left: 30, right: 10, top: 12, bottom: 20 }

export function GlucoseLog() {
  const { user } = useAuth()
  const { meals } = useRecentMeals(user?.uid ?? "", 1)
  const { points, mealEvents, current, avg, peak, mealCount, logMeal } = useLiveCGM()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastMealIdRef = useRef<string | null>(null)

  // Trigger spike when a new meal upload lands in Firestore
  useEffect(() => {
    if (!meals.length) return
    const latest = meals[0]
    if (latest.meal_id !== lastMealIdRef.current) {
      lastMealIdRef.current = latest.meal_id
      logMeal(latest.name ?? "Meal")
    }
  }, [meals, logMeal])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top - PAD.bottom
    const toX = (i: number) => PAD.left + (i / (MAX_POINTS - 1)) * cW
    const toY = (v: number) => PAD.top + cH - ((v - MIN_Y) / (MAX_Y - MIN_Y)) * cH
    const startIdx = MAX_POINTS - points.length

    // Grid lines + Y labels
    ctx.font = "9px sans-serif"
    ctx.textAlign = "right"
    ;[4, 7, 10, 14].forEach(v => {
      const y = toY(v)
      ctx.strokeStyle = "#E8E2D5"
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.fillStyle = "#8E8470"
      ctx.fillText(String(v), PAD.left - 4, y + 3)
    })

    // 10.0 danger reference line
    const refY = toY(10.0)
    ctx.strokeStyle = "rgba(183,121,31,0.6)"
    ctx.lineWidth = 1
    ctx.setLineDash([5, 3])
    ctx.beginPath(); ctx.moveTo(PAD.left, refY); ctx.lineTo(W - PAD.right, refY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#B7791F"
    ctx.textAlign = "right"
    ctx.fillText("10.0", W - PAD.right - 2, refY - 3)

    // X-axis time labels
    ctx.fillStyle = "#8E8470"
    ctx.textAlign = "center"
    ;["-4h", "-3h", "-2h", "-1h", "now"].forEach((label, i) => {
      ctx.fillText(label, PAD.left + (i / 4) * cW, H - 3)
    })

    if (points.length < 2) { ctx.restore(); return }

    // Gradient area fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH)
    grad.addColorStop(0, "rgba(200,137,58,0.30)")
    grad.addColorStop(1, "rgba(200,137,58,0.02)")

    ctx.beginPath()
    points.forEach((v, i) => {
      const x = toX(startIdx + i)
      const y = toY(v)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(toX(startIdx + points.length - 1), PAD.top + cH)
    ctx.lineTo(toX(startIdx), PAD.top + cH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Main line
    ctx.beginPath()
    points.forEach((v, i) => {
      const x = toX(startIdx + i)
      const y = toY(v)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = "#C8893A"
    ctx.lineWidth = 2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.stroke()

    // Meal event markers
    mealEvents.forEach(ev => {
      if (ev.pointIndex < 0 || ev.pointIndex >= points.length) return
      const x = toX(startIdx + ev.pointIndex)
      const y = toY(points[ev.pointIndex])

      ctx.strokeStyle = "rgba(45,95,63,0.5)"
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + cH); ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = "#2D5F3F"
      ctx.fill()

      ctx.fillStyle = "#2D5F3F"
      ctx.textAlign = "left"
      ctx.font = "bold 9px sans-serif"
      ctx.fillText(ev.name, x + 6, PAD.top + 10)
    })

    // Pulsing live dot at right edge
    const lx = toX(startIdx + points.length - 1)
    const ly = toY(points[points.length - 1])
    const pulse = Math.sin(Date.now() / 400) * 0.5 + 0.5

    ctx.beginPath()
    ctx.arc(lx, ly, 5 + pulse * 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(200,137,58,${0.12 + 0.08 * pulse})`
    ctx.fill()

    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2)
    ctx.fillStyle = "#C8893A"; ctx.fill()

    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = "#FAF1DF"; ctx.fill()

    ctx.restore()
  }, [points, mealEvents])

  // rAF draw loop — smooth animation independent of data ticks
  useEffect(() => {
    let frameId: number
    const loop = () => { draw(); frameId = requestAnimationFrame(loop) }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [draw])

  // Size canvas correctly for device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = 160 * dpr
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  const valColor = current > 10 ? "text-gl-red" : current < 4 ? "text-gl-teal" : "text-gl-ink"

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gl-ink">Blood Glucose</h2>
          <p className="text-xs text-gl-stone-400">CGM · last 4 hours</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end mb-1">
            <span className="w-2 h-2 rounded-full bg-gl-green animate-pulse inline-block" />
            <span className="text-gl-green text-xs font-bold tracking-wide">LIVE</span>
          </div>
          <span className={`text-2xl font-bold font-mono-gl ${valColor}`}>{current.toFixed(1)}</span>
          <span className="text-xs text-gl-stone-400"> mmol/L</span>
        </div>
      </div>

      {/* Canvas chart */}
      <canvas ref={canvasRef} className="w-full rounded-md bg-gl-bg-elev" style={{ height: 160 }} />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-gl-stone-50 rounded-md p-2.5 text-center">
          <p className="text-[9px] text-gl-stone-400 uppercase tracking-wide mb-1">4-hr Avg</p>
          <p className="text-base font-bold font-mono-gl text-brand-500">{avg}</p>
          <p className="text-[10px] text-gl-stone-400">mmol/L</p>
        </div>
        <div className="bg-gl-stone-50 rounded-md p-2.5 text-center">
          <p className="text-[9px] text-gl-stone-400 uppercase tracking-wide mb-1">Peak</p>
          <p className={`text-base font-bold font-mono-gl ${peak > 10 ? "text-gl-red" : "text-gl-amber"}`}>{peak}</p>
          <p className="text-[10px] text-gl-stone-400">mmol/L</p>
        </div>
        <div className="bg-gl-stone-50 rounded-md p-2.5 text-center">
          <p className="text-[9px] text-gl-stone-400 uppercase tracking-wide mb-1">Meals</p>
          <p className="text-base font-bold font-mono-gl text-gl-green">{mealCount}</p>
          <p className="text-[10px] text-gl-stone-400">logged</p>
        </div>
      </div>
    </Card>
  )
}
