import * as React from "react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  label: string
  value: string | number
  delta?: string
  deltaType?: "increase" | "decrease" | "neutral"
  isAiMetric?: boolean
  sparklinePoints?: number[]
  className?: string
}

export function KPICard({
  label,
  value,
  delta,
  deltaType = "increase",
  isAiMetric = false,
  sparklinePoints,
  className,
}: KPICardProps) {
  const strokeColor = isAiMetric ? "var(--gold)" : "var(--line3)"

  // Render a minimal, GPU-friendly 22px SVG sparkline
  const renderSparkline = () => {
    const points = sparklinePoints || [14, 18, 12, 16, 20, 15, 22]
    const width = 80
    const height = 22
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width
      const y = height - ((p - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const pathD = `M ${coords.join(" L ")}`

    return (
      <svg
        className="w-20 h-[22px] shrink-0"
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d={pathD}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const deltaColorClass =
    deltaType === "increase"
      ? "text-[var(--green)]"
      : deltaType === "decrease"
      ? "text-[var(--red)]"
      : "text-[var(--t3)]"

  return (
    <div
      className={cn(
        "rounded-[12px] bg-[var(--s1)] border border-[var(--line)] p-4 flex flex-col justify-between transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between text-[12px] text-[var(--t2)] font-medium mb-2">
        <span className="truncate">{label}</span>
        {isAiMetric && (
          <span className="text-[var(--gold)] text-[10px] font-mono uppercase tracking-wider">
            AI
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[26px] font-semibold tracking-[-0.03em] font-mono text-[var(--t1)] tabular-nums leading-none">
          {value}
        </span>
        {delta && (
          <span className={cn("text-[11.5px] font-mono tabular-nums font-medium", deltaColorClass)}>
            {delta}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end">
        {renderSparkline()}
      </div>
    </div>
  )
}
