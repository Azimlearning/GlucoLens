import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { PatientLayout } from "@/components/patient/PatientLayout"
import { HomeTab }    from "@/components/patient/HomeTab"
import { LogTab }     from "@/components/patient/LogTab"
import { TrendsTab }  from "@/components/patient/TrendsTab"
import { ToolsTab }   from "@/components/patient/ToolsTab"
import { ProfileTab } from "@/components/patient/ProfileTab"
import type { TabId } from "@/components/patient/PatientLayout"

export default function PatientDashboard() {
  return (
    <ProtectedRoute requiredRole="patient">
      <PatientLayout>
        {(activeTab: TabId) => {
          switch (activeTab) {
            case "home":    return <HomeTab />
            case "log":     return <LogTab />
            case "trends":  return <TrendsTab />
            case "tools":   return <ToolsTab />
            case "profile": return <ProfileTab />
            default:        return <HomeTab />
          }
        }}
      </PatientLayout>
    </ProtectedRoute>
  )
}

