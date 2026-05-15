export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

export function formatMmol(value: number): string {
  return `${value.toFixed(1)} mmol/L`
}

export function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`
}

export function formatGrams(value: number): string {
  return `${Math.round(value)}g`
}

export function formatPct(value: number): string {
  return `${Math.round(value)}%`
}

export function riskLabel(score: number): string {
  if (score >= 7) return "High"
  if (score >= 4) return "Moderate"
  return "Low"
}

export function riskColor(score: number): string {
  if (score >= 7) return "text-red-600 bg-red-50 border-red-200"
  if (score >= 4) return "text-amber-600 bg-amber-50 border-amber-200"
  return "text-emerald-600 bg-emerald-50 border-emerald-200"
}
