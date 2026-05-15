import { useEffect, ReactNode } from "react"
import { useRouter } from "next/router"
import { useAuth } from "@/contexts/AuthContext"
import { Spinner } from "./Spinner"
import type { UserRole } from "@/lib/types"

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
    } else if (!loading && user && requiredRole && user.role !== requiredRole) {
      router.replace(user.role === "dietitian" ? "/dietitian" : "/patient")
    }
  }, [user, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return null
  if (requiredRole && user.role !== requiredRole) return null

  return <>{children}</>
}
