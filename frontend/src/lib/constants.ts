export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

// GL palette-aligned traffic-light chip classes
export const TRAFFIC_LIGHT_COLORS: Record<string, string> = {
  green: "text-gl-green bg-gl-green-soft border-transparent",
  amber: "text-gl-amber bg-gl-amber-soft border-transparent",
  red:   "text-gl-red   bg-gl-red-soft   border-transparent",
}

export const TRAFFIC_LIGHT_LABELS: Record<string, string> = {
  green: "Good Choice",
  amber: "Moderate",
  red:   "High Risk",
}

export const VERDICT_COLORS: Record<string, string> = {
  safe:                  "text-gl-green bg-gl-green-soft",
  caution:               "text-gl-amber bg-gl-amber-soft",
  harmful_for_you:       "text-gl-red   bg-gl-red-soft",
  insufficient_evidence: "text-gl-stone-500 bg-gl-stone-50",
}

export const VERDICT_LABELS: Record<string, string> = {
  safe:                  "Safe",
  caution:               "Use Caution",
  harmful_for_you:       "Harmful For You",
  insufficient_evidence: "Insufficient Evidence",
}

export const DEMO_USERS = {
  patient:   { email: "rahman@demo.com",  password: "demo123", name: "Rahman (Patient)" },
  dietitian: { email: "aisyah@demo.com",  password: "demo123", name: "Aisyah (Dietitian)" },
  demo:      { email: "meiling@demo.com", password: "demo123", name: "Mei Ling (New User)" },
}
