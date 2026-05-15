/**
 * ProfileTab — Account settings, body metrics, targets, medications.
 * Managed by dietitian but viewable/navigable by patient.
 */
import { useAuth } from "@/contexts/AuthContext"
import { UserProfileCard } from "./UserProfileCard"

export function ProfileTab() {
  const { user } = useAuth()
  const uid = user?.uid ?? ""

  return (
    <div className="space-y-4">
      <UserProfileCard uid={uid} />
    </div>
  )
}
