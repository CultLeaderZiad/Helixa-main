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
      className={`rounded-2xl border border-white/[0.07] bg-[#0c0d12]/70 backdrop-blur-sm text-center transition-all ${
        compact ? "p-6" : "p-10 md:p-12"
      } ${className}`}
    >
      {badge && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#e5a93c]/25 bg-[#e5a93c]/10 px-2.5 py-0.5 font-mono-ui text-[10px] font-semibold uppercase tracking-wider text-[#e5a93c]">
            {badge}
          </span>
        </div>
      )}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e5a93c]/20 bg-[#e5a93c]/10 text-[#e5a93c] shadow-[0_0_20px_rgba(229,169,60,0.06)]">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>

      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs md:text-sm text-zinc-400 leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e5a93c] hover:bg-[#d4952b] px-4 py-2 text-xs font-semibold text-black transition-all active:scale-[0.98] shadow-sm font-mono-ui uppercase tracking-wider"
              >
                {action.icon && <action.icon className="h-3.5 w-3.5" />}
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e5a93c] hover:bg-[#d4952b] px-4 py-2 text-xs font-semibold text-black transition-all active:scale-[0.98] shadow-sm font-mono-ui uppercase tracking-wider cursor-pointer"
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
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white px-4 py-2 text-xs font-medium text-zinc-300 transition-all active:scale-[0.98]"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white px-4 py-2 text-xs font-medium text-zinc-300 transition-all active:scale-[0.98] cursor-pointer"
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
