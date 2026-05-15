import { useEffect, useState } from "react"
import { ref, onValue, off } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import type { Alert } from "@/lib/types"

export function useAlertFeed(uid: string): Alert[] {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    if (!uid) return
    const alertsRef = ref(rtdb, `dashboard/${uid}/alerts`)
    const handler = (snap: any) => {
      const val = snap.val()
      if (val) {
        setAlerts(Object.values(val) as Alert[])
      } else {
        setAlerts([])
      }
    }
    onValue(alertsRef, handler)
    return () => off(alertsRef, "value", handler)
  }, [uid])

  return alerts
}
