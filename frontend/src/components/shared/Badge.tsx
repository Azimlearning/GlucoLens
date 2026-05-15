import clsx from "clsx"

type BadgeVariant = "default" | "green" | "amber" | "red" | "teal" | "plum"

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gl-stone-50 text-gl-stone-600 border border-gl-stone-100",
  green:   "bg-gl-green-soft text-gl-green border-transparent",
  amber:   "bg-gl-amber-soft text-gl-amber border-transparent",
  red:     "bg-gl-red-soft   text-gl-red   border-transparent",
  teal:    "bg-gl-teal-soft  text-gl-teal  border-transparent",
  plum:    "bg-gl-plum-soft  text-gl-plum  border-transparent",
}

export function Badge({ label, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold tracking-wide border",
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  )
}
