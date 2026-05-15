import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { MealRecord } from "@/lib/types"

export function useMealHistory(patientId: string, count = 20): { meals: MealRecord[]; loading: boolean } {
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
