/**
 * AgentTag — Subtle attribution label for each AI agent output.
 *
 * Style spec: 11px · muted tertiary colour · uppercase · letter-spacing 0.5px
 * Usage: <AgentTag label="Nutrition analysis" agent={2} />
 * Renders:  NUTRITION ANALYSIS  ·  AGENT 2
 */

interface AgentTagProps {
  label: string
  agent: number | string
  className?: string
}

export function AgentTag({ label, agent, className = "" }: AgentTagProps) {
  return (
    <p
      className={`agent-tag ${className}`}
      style={{
        fontSize: 11,
        color: "var(--color-gl-stone-300, #B5AFA5)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontWeight: 500,
        marginTop: "10px",
      }}
      aria-label={`Output produced by Agent ${agent}: ${label}`}
    >
      {label}&ensp;·&ensp;Agent {agent}
    </p>
  )
}
