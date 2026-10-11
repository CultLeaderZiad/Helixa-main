import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string = string> {
  value: T
  label: React.ReactNode
}

interface SegmentedControlProps<T extends string = string> {
  options: Array<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  size?: "sm" | "default"
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "default",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center p-0.5 rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] select-none",
        size === "sm" ? "h-[26px]" : "h-[30px]",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative px-2.5 rounded-[4px] font-medium transition-colors cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[var(--t1)]",
              size === "sm" ? "h-[22px] text-[11px]" : "h-[26px] text-[12px]",
              selected
                ? "bg-[var(--s4)] text-[var(--t1)] font-medium shadow-2xs"
                : "text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--s3)]/50"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
