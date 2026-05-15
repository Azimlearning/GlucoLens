import { useState, FormEvent } from "react"
import { useRouter } from "next/router"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/shared/Button"
import { LoginIllo } from "@/components/shared/Illustrations"
import { DEMO_USERS } from "@/lib/constants"

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    } catch {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (key: keyof typeof DEMO_USERS) => {
    setEmail(DEMO_USERS[key].email)
    setPassword(DEMO_USERS[key].password)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gl-bg">
      {/* ── Illustration panel (md+) ── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] relative overflow-hidden bg-brand-50 flex-col justify-end">
        <LoginIllo className="w-full h-full object-cover absolute inset-0" />

        {/* Brand lockup over illustration */}
        <div className="relative z-10 p-10 pb-12">
          <div className="inline-flex items-center gap-2 bg-gl-bg-elev/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-gl-sm border border-gl-stone-100/60">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="font-mono-gl text-xs font-medium text-gl-stone-500 tracking-widest uppercase">
              Clinical Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16 min-h-screen md:min-h-0">
        {/* Mobile brand header */}
        <div className="md:hidden mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </div>
          <h1 className="font-display text-h2 text-gl-ink">GlucoLens</h1>
          <p className="text-sm text-gl-stone-400 mt-1">Clinical Nutrition Companion</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Desktop brand header */}
          <div className="hidden md:block mb-10">
            <h1 className="font-display text-h1 text-gl-ink leading-tight">GlucoLens</h1>
            <p className="text-body text-gl-stone-400 mt-2">Clinical Nutrition Companion</p>
          </div>

          <h2 className="text-h4 font-semibold text-gl-ink mb-1">Welcome back</h2>
          <p className="text-sm text-gl-stone-400 mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gl-ink-soft">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={[
                  "w-full px-4 py-3.5 rounded-md text-[15px] bg-gl-bg-elev",
                  "border border-gl-stone-200 text-gl-ink placeholder-gl-stone-300",
                  "transition-all duration-fast ease-gl",
                  "focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
                ].join(" ")}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gl-ink-soft">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    "w-full px-4 py-3.5 rounded-md text-[15px] bg-gl-bg-elev pr-12",
                    "border border-gl-stone-200 text-gl-ink placeholder-gl-stone-300",
                    "transition-all duration-fast ease-gl",
                    "focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gl-stone-400 hover:text-gl-stone-500 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md bg-gl-red-soft border border-gl-red/20 px-3.5 py-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A33B2A" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-gl-red font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1">
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 pt-7 border-t border-gl-stone-100">
            <p className="text-xs text-gl-stone-400 text-center mb-3 font-medium uppercase tracking-wider">
              Try a demo account
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(DEMO_USERS) as [keyof typeof DEMO_USERS, { name: string }][]).map(
                ([key, u]) => (
                  <button
                    key={key}
                    onClick={() => fillDemo(key)}
                    className={[
                      "text-xs rounded-md border border-gl-stone-200 px-2 py-2.5",
                      "text-gl-stone-500 bg-gl-bg-elev hover:bg-gl-stone-50 hover:border-gl-stone-300",
                      "transition-all duration-fast ease-gl active:scale-[0.97]",
                      "leading-snug font-medium",
                    ].join(" ")}
                  >
                    {u.name}
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-gl-stone-300 text-center mt-3">
              All accounts use password:{" "}
              <span className="font-mono-gl text-gl-stone-400">demo123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
