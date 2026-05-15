import { useEffect, useRef, useState, useCallback } from "react"

export interface MealEvent {
  pointIndex: number
  name: string
}

export interface LiveCGMState {
  points: number[]
  mealEvents: MealEvent[]
  current: number
  avg: number
  peak: number
  mealCount: number
  logMeal: (mealName: string) => void
}

export const MAX_POINTS = 150
const TICK_MS = 80

type Phase = "baseline" | "rising" | "falling"

function initPoints(): number[] {
  const pts: number[] = []
  let b = 5.2
  let c = 5.2
  for (let i = 0; i < MAX_POINTS; i++) {
    const drift = (Math.random() - 0.5) * 0.08
    b = Math.max(4.4, Math.min(6.5, b + drift))
    c = +(c + (b - c) * 0.12 + (Math.random() - 0.5) * 0.07).toFixed(2)
    c = Math.max(3.5, Math.min(14.5, c))
    pts.push(c)
  }
  return pts
}

export function useLiveCGM(): LiveCGMState {
  const baselineRef = useRef(5.2)
  const currentRef = useRef(5.2)
  const phaseRef = useRef<Phase>("baseline")
  const spikeTargetRef = useRef(0)
  const spikeProgressRef = useRef(0)
  const mealCountRef = useRef(0)

  const [state, setState] = useState<Omit<LiveCGMState, "logMeal">>(() => {
    const pts = initPoints()
    currentRef.current = pts[pts.length - 1]
    return {
      points: pts,
      mealEvents: [],
      current: pts[pts.length - 1],
      avg: +(pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(1),
      peak: +Math.max(...pts).toFixed(1),
      mealCount: 0,
    }
  })

  const logMeal = useCallback((mealName: string) => {
    if (phaseRef.current === "rising") return
    phaseRef.current = "rising"
    spikeTargetRef.current = +(9.8 + Math.random() * 2.0).toFixed(1)
    spikeProgressRef.current = 0
    mealCountRef.current += 1

    setState(prev => ({
      ...prev,
      mealCount: mealCountRef.current,
      mealEvents: [
        ...prev.mealEvents,
        { pointIndex: prev.points.length - 1, name: mealName },
      ],
    }))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      let next: number

      if (phaseRef.current === "rising") {
        next = currentRef.current + (spikeTargetRef.current - currentRef.current) * 0.35 + (Math.random() - 0.5) * 0.1
        spikeProgressRef.current++
        if (Math.abs(next - spikeTargetRef.current) < 0.25 || spikeProgressRef.current > 20) {
          next = spikeTargetRef.current
          phaseRef.current = "falling"
          spikeProgressRef.current = 0
        }
      } else if (phaseRef.current === "falling") {
        next = currentRef.current + (baselineRef.current - currentRef.current) * 0.035 + (Math.random() - 0.5) * 0.08
        spikeProgressRef.current++
        if (Math.abs(next - baselineRef.current) < 0.2 || spikeProgressRef.current > 80) {
          next = baselineRef.current
          phaseRef.current = "baseline"
          spikeProgressRef.current = 0
        }
      } else {
        const drift = (Math.random() - 0.5) * 0.08
        baselineRef.current = Math.max(4.4, Math.min(6.5, baselineRef.current + drift))
        next = currentRef.current + (baselineRef.current - currentRef.current) * 0.12 + (Math.random() - 0.5) * 0.07
      }

      next = Math.max(3.5, Math.min(14.5, +next.toFixed(2)))
      currentRef.current = next

      setState(prev => {
        let newPoints = [...prev.points, next]
        let newMealEvents = prev.mealEvents

        if (newPoints.length > MAX_POINTS) {
          const dropped = newPoints.length - MAX_POINTS
          newPoints = newPoints.slice(dropped)
          newMealEvents = newMealEvents
            .map(e => ({ ...e, pointIndex: e.pointIndex - dropped }))
            .filter(e => e.pointIndex >= 0)
        }

        return {
          points: newPoints,
          mealEvents: newMealEvents,
          current: next,
          avg: +(newPoints.reduce((a, b) => a + b, 0) / newPoints.length).toFixed(1),
          peak: +Math.max(...newPoints).toFixed(1),
          mealCount: prev.mealCount,
        }
      })
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [])

  return { ...state, logMeal }
}
