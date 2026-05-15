import axios from "axios"
import { auth } from "./firebase"
import { API_URL } from "./constants"

const apiClient = axios.create({ baseURL: API_URL })

// Attach Firebase JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, sign out and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await auth.signOut()
      window.location.href = "/"
    }
    return Promise.reject(error)
  }
)

export const api = {
  uploadMeal: (imageBase64: string, mealType?: string) =>
    apiClient.post("/meals/upload", { image_base64: imageBase64, meal_type: mealType ?? "unspecified", dry_run: true }),

  confirmMeal: (payload: {
    meal_name: string; meal_type: string
    nutrition_totals: Record<string, number>; meal_items: unknown[]
    traffic_light: Record<string, string>; risk_score: number
    recommendations: string[]; drug_interactions: unknown[]; applied_swaps: string[]
  }) => apiClient.post("/meals/confirm", payload),

  getMeal: (mealId: string) =>
    apiClient.get(`/meals/${mealId}`),

  deleteMeal: (mealId: string) =>
    apiClient.delete(`/meals/${mealId}`),

  logGlucose: (valueMmol: number, timestamp?: string, context?: string) =>
    apiClient.post("/glucose/entry", { glucose_value: valueMmol, timestamp, context: context ?? "random" }),

  checkMisinfo: (claimText: string) =>
    apiClient.post("/misinfo/check", { raw_query: claimText }),

  generateReport: () =>
    apiClient.post("/reports/weekly", {}),

  downloadReport: () =>
    apiClient.get("/reports/download", { responseType: "blob" }),

  generateReportForPatient: (patientId: string) =>
    apiClient.post(`/reports/weekly/${patientId}`),

  downloadReportForPatient: (patientId: string) =>
    apiClient.get(`/reports/download/${patientId}`, { responseType: "blob" }),

  getDashboard: (patientId?: string) =>
    apiClient.get("/dashboard/", { params: patientId ? { patient_id: patientId } : {} }),

  getMeetingPlan: (patientId: string) =>
    apiClient.post(`/scheduling/meeting-plan/${patientId}`),
}

export default apiClient
