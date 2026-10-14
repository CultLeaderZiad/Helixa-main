"use client"

import React from "react"
import Link from "next/link"
import { useWorkspaceUsage } from "@/hooks/use-workspace-usage"
import { cn } from "@/lib/utils"

interface UsageAlertChipProps {
  message?: string
  limitReached?: boolean
  severity?: "none" | "warning" | "hard_block"
  upgradeHref?: string
  className?: string
}

export function UsageAlertChip({
  message: overrideMessage,
  severity: overrideSeverity,
  upgradeHref = "/dashboard/billing",
  className,
}: UsageAlertChipProps) {
  const { usage, isLoading } = useWorkspaceUsage()

  const alert = usage?.alerts
  if (!overrideMessage && (!alert?.hasAlert || alert.severity === "none" || isLoading)) {
    return null
  }

  const message = overrideMessage || alert?.message || "Plan limit reached"
  const isHardBlock = overrideSeverity === "hard_block" || alert?.severity === "hard_block"

  return (
    <div
      role="alert"
      className={cn(
        "h-10 px-3.5 rounded-[10px] flex items-center justify-between gap-3 text-[13px] select-none transition-colors",
        isHardBlock
          ? "bg-[rgba(242,85,90,0.08)] border border-[rgba(242,85,90,0.25)] text-[var(--t1)]"
          : "bg-[rgba(245,165,36,0.08)] border border-[rgba(245,165,36,0.25)] text-[var(--t1)]",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isHardBlock ? "bg-[var(--red)]" : "bg-[var(--amber)]"
          )}
          aria-hidden="true"
        />
        <span className="truncate text-[12.5px] font-medium text-[var(--t1)]">
          {message}
        </span>
      </div>

      <Link
        href={upgradeHref}
        className="text-[12.5px] font-semibold text-[var(--gold)] hover:text-[var(--gold2)] hover:underline shrink-0 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  )
}
