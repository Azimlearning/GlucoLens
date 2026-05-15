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

export const MAX_POINTS = 270  // ~6h window on screen (loops continuously)
const TICK_MS = 80

type Phase = "baseline" | "rising" | "falling"

function generateInitialState(initialMeals: string[]): { points: number[], events: MealEvent[], current: number } {
  const points: number[] = []
  const events: MealEvent[] = []
  let current = 5.2
  let baseline = 5.2
  let phase: Phase = "baseline"
  let spikeTarget = 0
  let spikeProgress = 0
  
  // Evenly distribute up to 5 initial meals across the initial graph window
  const limitedMeals = initialMeals.slice(0, 5).reverse() // oldest first on the left
  const mealMap = new Map<number, string>()
  if (limitedMeals.length > 0) {
    // Spacing so they appear nicely distributed in the 270 point window
    const spacing = Math.floor(270 / (limitedMeals.length + 1))
    limitedMeals.forEach((m, i) => {
      const idx = spacing * (i + 1)
      mealMap.set(idx, m)
    })
  }

  for (let i = 0; i < MAX_POINTS; i++) {
    if (mealMap.has(i)) {
      phase = "rising"
      spikeTarget = +(9.8 + Math.random() * 2.0).toFixed(1)
      spikeProgress = 0
      events.push({ pointIndex: i, name: mealMap.get(i)! })
    }

    let next: number
    if (phase === "rising") {
      next = current + (spikeTarget - current) * 0.35 + (Math.random() - 0.5) * 0.1
      spikeProgress++
      if (Math.abs(next - spikeTarget) < 0.25 || spikeProgress > 20) {
        next = spikeTarget
        phase = "falling"
        spikeProgress = 0
      }
    } else if (phase === "falling") {
      next = current + (baseline - current) * 0.035 + (Math.random() - 0.5) * 0.08
      spikeProgress++
      if (Math.abs(next - baseline) < 0.2 || spikeProgress > 80) {
        next = baseline
        phase = "baseline"
        spikeProgress = 0
      }
    } else {
      const drift = (Math.random() - 0.5) * 0.08
      baseline = Math.max(4.4, Math.min(6.5, baseline + drift))
      next = current + (baseline - current) * 0.12 + (Math.random() - 0.5) * 0.07
    }

    next = Math.max(3.5, Math.min(14.5, +next.toFixed(2)))
    current = next
    points.push(next)
  }
  
  return { points, events, current }
}

export function useLiveCGM(initialMeals: string[] = []): LiveCGMState {
  const baselineRef = useRef(5.2)
  const currentRef = useRef(5.2)
  const phaseRef = useRef<Phase>("baseline")
  const spikeTargetRef = useRef(0)
  const spikeProgressRef = useRef(0)
  const mealCountRef = useRef(initialMeals.length)

  const [state, setState] = useState<Omit<LiveCGMState, "logMeal">>(() => {
    const init = generateInitialState(initialMeals)
    currentRef.current = init.current
    return {
      points: init.points,
      mealEvents: init.events,
      current: init.current,
      avg: +(init.points.reduce((a, b) => a + b, 0) / init.points.length).toFixed(1),
      peak: +Math.max(...init.points).toFixed(1),
      mealCount: initialMeals.length,
    }
  })

  // If initialMeals arrives after mount (e.g. from Firestore), re-init the graph.
  // We only do this if we haven't already spiked for something else and it's basically the first load.
  useEffect(() => {
    if (initialMeals.length > 0 && mealCountRef.current === 0) {
      mealCountRef.current = initialMeals.length
      const init = generateInitialState(initialMeals)
      currentRef.current = init.current
      phaseRef.current = "baseline"
      spikeTargetRef.current = 0
      spikeProgressRef.current = 0
      
      setState({
        points: init.points,
        mealEvents: init.events,
        current: init.current,
        avg: +(init.points.reduce((a, b) => a + b, 0) / init.points.length).toFixed(1),
        peak: +Math.max(...init.points).toFixed(1),
        mealCount: initialMeals.length,
      })
    }
  }, [initialMeals])

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
