export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export const TRAFFIC_LIGHT_COLORS: Record<string, string> = {
  green: "text-emerald-600 bg-emerald-50 border-emerald-200",
  amber: "text-amber-600 bg-amber-50 border-amber-200",
  red: "text-red-600 bg-red-50 border-red-200",
}

export const TRAFFIC_LIGHT_LABELS: Record<string, string> = {
  green: "Good Choice",
  amber: "Moderate",
  red: "High Risk",
}

export const VERDICT_COLORS: Record<string, string> = {
  safe: "text-emerald-600 bg-emerald-50",
  caution: "text-amber-600 bg-amber-50",
  harmful_for_you: "text-red-600 bg-red-50",
  insufficient_evidence: "text-slate-600 bg-slate-50",
}

export const VERDICT_LABELS: Record<string, string> = {
  safe: "Safe",
  caution: "Use Caution",
  harmful_for_you: "Harmful For You",
  insufficient_evidence: "Insufficient Evidence",
}

export const DEMO_USERS = {
  patient:   { email: "rahman@demo.com",  password: "demo123", name: "Rahman (Patient)" },
  dietitian: { email: "aisyah@demo.com",  password: "demo123", name: "Aisyah (Dietitian)" },
  demo:      { email: "meiling@demo.com", password: "demo123", name: "Mei Ling (New User)" },
}
