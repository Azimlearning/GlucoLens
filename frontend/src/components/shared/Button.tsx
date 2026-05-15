import { ButtonHTMLAttributes, ReactNode } from "react"
import clsx from "clsx"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger"
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = "primary", loading, children, className, disabled, ...props }: ButtonProps) {
  const base = "rounded-xl px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-700 focus:ring-brand-500",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
  }
  return (
    <button className={clsx(base, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" /> : null}
      {children}
    </button>
  )
}
