import { ButtonHTMLAttributes, ReactNode } from "react"
import clsx from "clsx"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ink" | "danger"
  size?: "sm" | "md"
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = [
    "inline-flex items-center justify-center gap-2 rounded-pill font-semibold",
    "border border-transparent cursor-pointer select-none whitespace-nowrap",
    "transition-all duration-fast ease-spring-snap",
    "active:scale-[0.96]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
  ].join(" ")

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3 text-[15px]",
  }

  const variants = {
    primary: [
      "bg-brand-500 text-gl-bg",
      "shadow-saffron",
      "hover:bg-brand-600",
    ].join(" "),
    secondary: [
      "bg-transparent text-gl-ink",
      "border-gl-stone-200",
      "hover:bg-gl-stone-50",
    ].join(" "),
    ink: [
      "bg-gl-ink text-gl-bg",
      "hover:bg-gl-ink-soft",
    ].join(" "),
    danger: [
      "bg-gl-red text-white",
      "hover:bg-[#8A3122]",
    ].join(" "),
  }

  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
