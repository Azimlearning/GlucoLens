import { useEffect, useState, useCallback } from "react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { MisinfoQuery } from "@/lib/types"

export function useMisinfoLog(patientId: string): { queries: MisinfoQuery[]; loading: boolean; refetch: () => void } {
  const [queries, setQueries] = useState<MisinfoQuery[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const q = query(
        collection(db, `patients/${patientId}/misinfo_log`),
        orderBy("timestamp", "desc"),
        limit(10)
      )
      const snap = await getDocs(q)
      setQueries(snap.docs.map((d) => ({ ...d.data(), query_id: d.id } as MisinfoQuery)))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { queries, loading, refetch: fetchData }
}
