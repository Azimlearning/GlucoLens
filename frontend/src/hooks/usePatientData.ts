import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { ref, onValue, off } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import type { MealRecord, GlucoseReading, Alert } from "@/lib/types"

export function useRecentMeals(patientId: string, count = 7) {
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    const q = query(
      collection(db, `patients/${patientId}/meals`),
      orderBy("timestamp", "desc"),
      limit(count)
    )
    const unsub = onSnapshot(q, (snap) => {
      setMeals(snap.docs.map((d) => d.data() as MealRecord))
      setLoading(false)
    })
    return unsub
  }, [patientId, count])

  return { meals, loading }
}

export function useRecentGlucose(patientId: string, count = 14) {
  const [readings, setReadings] = useState<GlucoseReading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    const q = query(
      collection(db, `patients/${patientId}/glucose`),
      orderBy("timestamp", "desc"),
      limit(count)
    )
    const unsub = onSnapshot(q, (snap) => {
      setReadings(snap.docs.map((d) => d.data() as GlucoseReading))
      setLoading(false)
    })
    return unsub
  }, [patientId, count])

  return { readings, loading }
}

export function useAlerts(patientId: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    if (!patientId) return
    const alertRef = ref(rtdb, `alerts/${patientId}`)
    const handler = (snap: any) => {
      const data = snap.val()
      if (data) setAlerts(Object.values(data) as Alert[])
    }
    onValue(alertRef, handler)
    return () => off(alertRef, "value", handler)
  }, [patientId])

  return alerts
}
