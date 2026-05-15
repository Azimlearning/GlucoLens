import { useState, FormEvent } from "react"
import { useRouter } from "next/router"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/shared/Button"
import { DEMO_USERS } from "@/lib/constants"

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  if (user) {
    router.replace(user.role === "dietitian" ? "/dietitian" : "/patient")
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      // AuthContext will update user; redirect handled above on re-render
    } catch {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: "patient" | "dietitian") => {
    setEmail(DEMO_USERS[role].email)
    setPassword(DEMO_USERS[role].password)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">GlucoLens</h1>
          <p className="text-slate-500 mt-1">Clinical Nutrition Companion</p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Sign In</Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 text-center mb-3">Demo accounts</p>
            <div className="flex gap-2">
              <button onClick={() => fillDemo("patient")} className="flex-1 text-xs rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors">
                Patient (Rahman)
              </button>
              <button onClick={() => fillDemo("dietitian")} className="flex-1 text-xs rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors">
                Dietitian (Aisyah)
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
