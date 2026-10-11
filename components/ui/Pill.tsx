import * as React from "react"
import { cn } from "@/lib/utils"

export type PillVariant = "green" | "amber" | "red" | "blue" | "gold" | "neutral"

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant
  dot?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<PillVariant, { badge: string; dot: string }> = {
  green: {
    badge: "bg-[var(--greenbg)] text-[var(--green)] border-[rgba(61,214,140,0.22)]",
    dot: "bg-[var(--green)]",
  },
  amber: {
    badge: "bg-[var(--amberbg)] text-[var(--amber)] border-[rgba(245,165,36,0.25)]",
    dot: "bg-[var(--amber)]",
  },
  red: {
    badge: "bg-[var(--redbg)] text-[var(--red)] border-[rgba(242,85,90,0.25)]",
    dot: "bg-[var(--red)]",
  },
  blue: {
    badge: "bg-[var(--bluebg)] text-[var(--blue)] border-[rgba(110,168,254,0.25)]",
    dot: "bg-[var(--blue)]",
  },
  gold: {
    badge: "bg-[var(--goldbg)] text-[var(--gold2)] border-[var(--goldline)]",
    dot: "bg-[var(--gold)]",
  },
  neutral: {
    badge: "bg-[var(--s3)] text-[var(--t2)] border-[var(--line2)]",
    dot: "bg-[var(--t3)]",
  },
}

export function Pill({
  variant = "green",
  dot = true,
  icon,
  className,
  children,
  ...props
}: PillProps) {
  const styles = variantStyles[variant]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-5 px-2 rounded-[10px] text-[11px] font-medium border leading-none shrink-0 select-none",
        styles.badge,
        className
      )}
      {...props}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : dot ? (
        <span className={cn("size-1.5 rounded-full shrink-0", styles.dot)} />
      ) : null}
      <span>{children}</span>
    </span>
  )
}
