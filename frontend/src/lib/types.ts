export type UserRole = "patient" | "dietitian"

export interface User {
  uid: string
  email: string
  name: string
  role: UserRole
}

export interface PatientProfile {
  uid: string
  name: string
  age: number
  gender: string
  weight_kg: number
  height_cm: number
  bmi: number
  hba1c_percent: number
  medications: string[]
  daily_calorie_target: number
  daily_carb_target_g: number
  dietitian_id: string
}

export type TrafficLight = "green" | "amber" | "red"

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "unspecified"

export interface MealRecord {
  meal_id: string
  patient_id: string
  timestamp: string
  name: string
  meal_type?: MealType
  traffic_light: TrafficLight
  calories: number
  carbs_g: number
  risk_score?: number
  meal_risk_score: number
  swap_suggestions?: SwapSuggestion[]
  nutrition_breakdown?: NutritionItem[]
  nutrition_totals?: {
    calories_kcal: number
    carbs_g: number
    protein_g: number
    fat_g: number
    sodium_mg: number
    glycemic_load: number
    fiber_g?: number
  }
  meal_items?: Array<{
    name: string
    portion_g?: number
    components?: string[]
    nutrition_per_100g?: {
      calories_kcal: number
      carbs_g: number
      protein_g: number
      fat_g: number
      fiber_g: number
      sodium_mg: number
    }
    gi?: number
    gl?: number
    confidence?: number
    allergens_triggered?: string[]
    category?: string
  }>
}

export interface NutritionItem {
  name: string
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  gi: number
  gl: number
}

export interface SwapSuggestion {
  original: string
  swap: string
  reason: string
}

export interface GlucoseReading {
  reading_id: string
  patient_id: string
  value_mmol: number
  timestamp: string
  meal_id?: string
}

export interface Alert {
  alert_id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  message: string
  timestamp: string
  read: boolean
}

export type MisinfoVerdict = "safe" | "caution" | "harmful_for_you" | "insufficient_evidence"

export interface MisinfoQuery {
  query_id: string
  claim_text: string
  verdict: MisinfoVerdict
  evidence_summary: string
  timestamp: string
}

export interface WeekSummary {
  week_start: string
  week_end: string
  avg_calories: number
  avg_carbs_g: number
  green_meals: number
  amber_meals: number
  red_meals: number
  avg_glucose_mmol: number
  report_url?: string
}

// API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
