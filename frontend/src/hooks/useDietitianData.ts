import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { PatientProfile } from "@/lib/types"

export function usePatientList(dietitianId: string) {
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dietitianId) return
    const q = query(collection(db, "patients"), where("dietitian_id", "==", dietitianId))
    getDocs(q).then((snap) => {
      // Each doc is a patient profile subcollection parent — fetch profile/main
      const profiles: PatientProfile[] = []
      snap.forEach((d) => profiles.push(d.data() as PatientProfile))
      setPatients(profiles)
      setLoading(false)
    })
  }, [dietitianId])

  return { patients, loading }
}
