import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Badge } from "@/components/shared/Badge"
import { Button } from "@/components/shared/Button"
import { Spinner } from "@/components/shared/Spinner"
import { VERDICT_COLORS, VERDICT_LABELS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import type { MisinfoVerdict } from "@/lib/types"

interface MisinfoEntry {
  query_id: string
  claim_text: string
  verdict: MisinfoVerdict
  evidence_summary: string
  timestamp: string
  seen_by_dietitian: boolean
}

interface MisinfoLogProps {
  patientId: string
}

export function MisinfoLog({ patientId }: MisinfoLogProps) {
  const [entries, setEntries] = useState<MisinfoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchLog = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, `patients/${patientId}/misinfo_log`),
        orderBy("timestamp", "desc"),
        limit(10)
      )
      const snap = await getDocs(q)
      setEntries(snap.docs.map((d) => ({ ...d.data(), query_id: d.id } as MisinfoEntry)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (patientId) fetchLog()
  }, [patientId])

  const markReviewed = async (queryId: string) => {
    setUpdatingId(queryId)
    try {
      await updateDoc(doc(db, `patients/${patientId}/misinfo_log/${queryId}`), {
        seen_by_dietitian: true,
      })
      setEntries((prev) =>
        prev.map((e) => (e.query_id === queryId ? { ...e, seen_by_dietitian: true } : e))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No misinfo queries found.</p>
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.query_id} className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{entry.claim_text}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.timestamp)}</p>
            </div>
            <Badge
              label={VERDICT_LABELS[entry.verdict] ?? entry.verdict}
              className={VERDICT_COLORS[entry.verdict]}
            />
          </div>
          {!entry.seen_by_dietitian && (
            <Button
              variant="secondary"
              className="mt-2 text-xs py-1 px-3"
              loading={updatingId === entry.query_id}
              onClick={() => markReviewed(entry.query_id)}
            >
              Mark as reviewed
            </Button>
          )}
          {entry.seen_by_dietitian && (
            <p className="text-xs text-emerald-600 mt-1">✓ Reviewed</p>
          )}
        </li>
      ))}
    </ul>
  )
}
