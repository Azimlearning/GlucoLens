/**
 * PatientLayout — 5-tab bottom navigation shell
 * Tabs: Home | Log | Trends | Tools | Profile
 * Includes a Floating Action Button (FAB) on Home + Trends that
 * jumps directly to the Log tab.
 */
import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"

// ── Tab definitions ──────────────────────────────────────────────────────
export type TabId = "home" | "log" | "trends" | "tools" | "profile"

const TABS: { id: TabId; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: "home", label: "Home",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={a ? "#C8893A" : "#8E8470"}>
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" fill={a ? "#F5E2C0" : "none"} />
        <path d="M8 20v-8h6v8" />
      </svg>
    ),
  },
  {
    id: "log", label: "Log",
    icon: (a) => (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="13" r="12" fill={a ? "#C8893A" : "#F5E2C0"} />
        <line x1="13" y1="8" x2="13" y2="18" stroke={a ? "#fff" : "#C8893A"} strokeWidth="2.2" />
        <line x1="8"  y1="13" x2="18" y2="13" stroke={a ? "#fff" : "#C8893A"} strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    id: "trends", label: "Trends",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={a ? "#C8893A" : "#8E8470"}>
        <polyline points="3,17 8,11 12,14 17,7 21,10" />
        <circle cx="21" cy="10" r="1.5" fill={a ? "#C8893A" : "#8E8470"} />
      </svg>
    ),
  },
  {
    id: "tools", label: "Tools",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={a ? "#C8893A" : "#8E8470"}>
        <circle cx="11" cy="11" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
  {
    id: "profile", label: "Profile",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={a ? "#C8893A" : "#8E8470"}>
        <circle cx="11" cy="7" r="4" fill={a ? "#F5E2C0" : "none"} />
        <path d="M2 20c0-4 4-7 9-7s9 3 9 7" />
      </svg>
    ),
  },
]

// ── Context for child tabs to navigate ───────────────────────────────────
import { createContext, useContext } from "react"
export const TabNavigationCtx = createContext<{
  activeTab: TabId
  goTo: (tab: TabId) => void
}>({ activeTab: "home", goTo: () => {} })

export function useTabNavigation() { return useContext(TabNavigationCtx) }

// ── Layout shell ─────────────────────────────────────────────────────────
interface Props {
  children: (activeTab: TabId, goTo: (tab: TabId) => void) => JSX.Element
}

export function PatientLayout({ children }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const goTo = useCallback((tab: TabId) => setActiveTab(tab), [])
  const { logout, user } = useAuth()

  // Hide tab bar during Log flow to give full screen — handled inside LogTab
  const showFAB = activeTab === "home" || activeTab === "trends"

  return (
    <TabNavigationCtx.Provider value={{ activeTab, goTo }}>
      <div className="min-h-screen bg-gl-bg flex flex-col">

        {/* ── Top bar ── */}
        <header className="bg-gl-bg-elev border-b border-gl-stone-100 shadow-gl-sm px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
            <h1 className="font-display text-[18px] text-gl-ink leading-none">GlucoLens</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gl-stone-400 hidden sm:block">{user?.name}</p>
            <button
              onClick={logout}
              className="text-xs text-gl-stone-400 hover:text-gl-ink border border-gl-stone-200 rounded-pill px-3 py-1.5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Main scrollable content ── */}
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
            {children(activeTab, goTo)}
          </div>
        </main>

        {/* ── FAB ── */}
        {showFAB && (
          <button
            id="fab-log-meal"
            onClick={() => goTo("log")}
            aria-label="Log a meal"
            className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-gl flex items-center justify-center z-40 transition-transform active:scale-95"
            style={{ background: "#C8893A" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2.5" />
              <line x1="5"  y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.5" />
            </svg>
          </button>
        )}

        {/* ── Bottom tab bar ── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-gl-bg-elev border-t border-gl-stone-100"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex items-stretch max-w-2xl mx-auto">
            {TABS.map(({ id, label, icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  id={`tab-${id}`}
                  onClick={() => goTo(id)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
                    active ? "text-brand-600" : "text-gl-stone-400 hover:text-gl-stone-600",
                  ].join(" ")}
                >
                  {icon(active)}
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: active ? "#C8893A" : "#8E8470" }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

      </div>
    </TabNavigationCtx.Provider>
  )
}
