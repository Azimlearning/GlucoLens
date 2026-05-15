import { ReactNode } from "react"
import clsx from "clsx"

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
}

export function Card({ children, className, elevated = false }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-6",
        elevated
          ? "bg-gl-bg-elev border-gl-stone-100 shadow-gl"
          : "bg-gl-bg-elev border-gl-stone-100 shadow-gl-sm",
        className
      )}
    >
      {children}
    </div>
  )
}
