interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      {/* Dot cluster — a calm, brand-neutral placeholder */}
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="8"  cy="16" r="4" fill="#D6CDBB" />
        <circle cx="20" cy="16" r="4" fill="#B8AD96" />
        <circle cx="32" cy="16" r="4" fill="#D6CDBB" />
      </svg>
      <p className="text-sm font-semibold text-gl-stone-500">{title}</p>
      {description && (
        <p className="text-xs text-gl-stone-400 max-w-[240px] leading-relaxed">{description}</p>
      )}
    </div>
  )
}
