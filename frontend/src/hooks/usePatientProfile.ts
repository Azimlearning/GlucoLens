import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { PatientProfile } from "@/lib/types"

export function usePatientProfile(patientId: string) {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    const ref = doc(db, `patients/${patientId}/profile/main`)
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? (snap.data() as PatientProfile) : null)
      setLoading(false)
    })
    return unsub
  }, [patientId])

  return { profile, loading }
}
