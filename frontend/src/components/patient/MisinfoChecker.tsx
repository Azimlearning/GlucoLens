import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/shared/Button"
import { Card } from "@/components/shared/Card"
import { Badge } from "@/components/shared/Badge"
import { VERDICT_COLORS, VERDICT_LABELS } from "@/lib/constants"
import type { MisinfoVerdict } from "@/lib/types"

const DISCLAIMER = "This is my suggestion based on available evidence — please refer to your dietitian or doctor before changing your diet, supplements, or medications."

export function MisinfoChecker() {
  const [claim, setClaim] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ verdict: MisinfoVerdict; evidence_summary: string; sources: string[] } | null>(null)
  const [error, setError] = useState("")

  const handleCheck = async () => {
    if (claim.trim().length < 5) return
    setLoading(true); setError(""); setResult(null)
    try {
      const { data } = await api.checkMisinfo(claim)
      if (data.success) setResult({ verdict: data.verdict, evidence_summary: data.evidence_summary, sources: data.sources ?? [] })
      else setError(data.error ?? "Check failed")
    } catch { setError("Failed to check claim.") }
    finally { setLoading(false) }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Check Health Claim</h2>
      <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={3}
        placeholder="e.g. Is bitter gourd juice good for diabetes?"
        aria-label="Health claim to check"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
      <Button onClick={handleCheck} loading={loading} className="mt-3 w-full" disabled={claim.trim().length < 5}>Check Claim</Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Verdict:</span>
            <Badge label={VERDICT_LABELS[result.verdict]} className={VERDICT_COLORS[result.verdict]} />
          </div>
          <p className="text-sm text-slate-700">{result.evidence_summary}</p>
          <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-3">{DISCLAIMER}</p>
        </div>
      )}
    </Card>
  )
}