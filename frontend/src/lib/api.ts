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

export const api = {
  uploadMeal: (imageBase64: string) =>
    apiClient.post("/meals/upload", { image_base64: imageBase64 }),

  logGlucose: (valueMmol: number, timestamp?: string, mealId?: string) =>
    apiClient.post("/glucose/entry", { value_mmol: valueMmol, timestamp, meal_id: mealId }),

  checkMisinfo: (claimText: string) =>
    apiClient.post("/misinfo/check", { claim_text: claimText }),

  generateReport: () =>
    apiClient.post("/reports/weekly", {}),

  getDashboard: (patientId?: string) =>
    apiClient.get("/dashboard/", { params: patientId ? { patient_id: patientId } : {} }),
}

export default apiClient
