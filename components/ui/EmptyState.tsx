import React from "react"
import Link from "next/link"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  badge?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: LucideIcon | React.ComponentType<{ className?: string }>
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  badge,
  title,
  description,
  action,
  secondaryAction,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--line)] bg-[var(--s1)] text-center transition-all ${
        compact ? "p-6" : "p-8 md:p-10"
      } ${className}`}
    >
      {badge && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line2)] bg-[var(--s2)] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-[var(--t2)]">
            {badge}
          </span>
        </div>
      )}
      <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--s2)] text-[var(--t2)]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-[var(--t1)] tracking-tight">{title}</h3>

      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs text-[var(--t3)] leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1.5 h-[30px] rounded-[6px] bg-[var(--t1)] hover:bg-white text-[var(--bg)] px-3 text-[12.5px] font-medium transition-colors"
              >
                {action.icon && <action.icon className="h-3.5 w-3.5" />}
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 h-[30px] rounded-[6px] bg-[var(--t1)] hover:bg-white text-[var(--bg)] px-3 text-[12.5px] font-medium transition-colors cursor-pointer"
              >
                {action.icon && <action.icon className="h-3.5 w-3.5" />}
                {action.label}
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-1.5 h-[30px] rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[var(--t2)] hover:text-[var(--t1)] px-3 text-[12.5px] font-medium transition-colors"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-1.5 h-[30px] rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[var(--t2)] hover:text-[var(--t1)] px-3 text-[12.5px] font-medium transition-colors cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
