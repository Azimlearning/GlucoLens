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
  const [result, setResult] = useState<{ verdict: MisinfoVerdict; verdict_explanation: string; evidence_sources: { title?: string; url?: string }[] } | null>(null)
  const [error, setError] = useState("")

  const handleCheck = async () => {
    if (claim.trim().length < 5) return
    setLoading(true); setError(""); setResult(null)
    try {
      const { data } = await api.checkMisinfo(claim)
      if (data.success) setResult({ verdict: data.verdict, verdict_explanation: data.verdict_explanation, evidence_sources: data.evidence_sources ?? [] })
      else setError(data.error ?? "Check failed")
    } catch { setError("Failed to check — please try again.") }
    finally { setLoading(false) }
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gl-ink">Ask Your Health Questions</h2>
          <p className="text-xs text-gl-stone-400 mt-0.5">
            Get evidence-based answers about food, diabetes, and nutrition
          </p>
        </div>
        {/* Icon */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="#C8893A">
          <circle cx="11" cy="11" r="9" />
          <line x1="11" y1="7" x2="11" y2="11" />
          <circle cx="11" cy="14.5" r="0.8" fill="#C8893A" stroke="none" />
        </svg>
      </div>

      <textarea
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        rows={3}
        placeholder="e.g. Is bitter gourd juice good for diabetes? Can I eat white rice?"
        aria-label="Health question to check"
        className="w-full rounded-xl border border-gl-stone-200 bg-gl-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none text-gl-ink placeholder:text-gl-stone-300"
      />

      <Button
        onClick={handleCheck}
        loading={loading}
        className="mt-3 w-full"
        disabled={claim.trim().length < 5}
      >
        Get Answer
      </Button>

      {error && <p className="mt-3 text-sm text-gl-red">{error}</p>}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gl-stone-500">Verdict:</span>
            <Badge label={VERDICT_LABELS[result.verdict]} className={VERDICT_COLORS[result.verdict]} />
          </div>
          <p className="text-sm text-gl-ink-soft leading-relaxed">{result.verdict_explanation}</p>

          {/* Evidence sources */}
          {result.evidence_sources && result.evidence_sources.length > 0 && (
            <div className="rounded-lg bg-gl-stone-50 border border-gl-stone-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-gl-stone-400 uppercase tracking-wide mb-1.5">Sources</p>
              <ul className="space-y-1">
                {result.evidence_sources.slice(0, 3).map((src, i) => (
                  <li key={i} className="text-xs text-gl-stone-500">
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                        {src.title ?? src.url}
                      </a>
                    ) : (
                      src.title ?? "Source"
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gl-stone-300 italic border-t border-gl-stone-100 pt-3">{DISCLAIMER}</p>

          {/* Agent attribution */}
          <p className="text-[10px] text-gl-stone-300 uppercase tracking-widest">Evidence review · Agent 8</p>
        </div>
      )}
    </Card>
  )
}