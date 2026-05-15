"use client"

/**
 * StaggeredCardList
 *
 * Animates children in sequentially using pure CSS animation-delay.
 * No JS timers — no React strict-mode double-invoke issues,
 * no stale closures, no cleanup bugs.
 *
 * Each child gets `animationDelay: i * delayBetweenMs + "ms"` on mount.
 * The keyframe is defined inline via a <style> tag so we don't need a
 * global CSS file change.
 */

interface Props {
  children: React.ReactNode[]
  delayBetweenMs?: number
  /** Changing this key forces a full remount and replays the animation */
  animKey?: string | number
}

const KEYFRAME = `
@keyframes glSlideUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0px); }
}
`

export function StaggeredCardList({ children, delayBetweenMs = 180, animKey }: Props) {
  return (
    <>
      {/* Inject keyframe once — harmless if injected multiple times */}
      <style>{KEYFRAME}</style>

      {/* Force remount when animKey changes so animation replays */}
      <div key={animKey} className="flex flex-col gap-4">
        {children.map((child, i) => (
          <div
            key={i}
            style={{
              animation: `glSlideUp 0.35s ease both`,
              animationDelay: `${i * delayBetweenMs}ms`,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </>
  )
}
