import { useEffect, useState } from "react"
import { ref, onValue, off } from "firebase/database"
import { rtdb } from "@/lib/firebase"

export function useRealtimeDashboard(uid: string): any | null {
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    if (!uid) return
    const dashRef = ref(rtdb, `dashboard/${uid}/live`)
    const handler = (snap: any) => {
      setData(snap.val())
    }
    onValue(dashRef, handler)
    return () => off(dashRef, "value", handler)
  }, [uid])

  return data
}
