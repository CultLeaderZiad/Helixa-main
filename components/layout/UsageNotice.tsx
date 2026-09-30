"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface UsageMetric {
  metric: string
  level: "ok" | "soft" | "hard"
  message: string
  remaining: number | null
  limit: number
}

export function UsageNotice() {
  const [warnings, setWarnings] = useState<UsageMetric[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/billing/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (cancelled || !Array.isArray(json?.metrics)) return
        setWarnings(
          json.metrics.filter((metric: UsageMetric) => metric.level === "soft" || metric.level === "hard" || (metric.limit >= 0 && metric.remaining === 0)),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!warnings.length) return null
  const hard = warnings.some((warning) => warning.level === "hard" || warning.remaining === 0)

  return (
    <div className={`mx-4 mt-4 md:mx-6 rounded-xl border px-4 py-3 ${hard ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <ul className="space-y-1 text-sm text-neutral-100">
          {warnings.map((warning) => (
            <li key={warning.metric}>{warning.message || `${warning.metric} is at the plan limit.`}</li>
          ))}
        </ul>
        <Link href="/dashboard/usage" className="shrink-0 text-xs font-semibold text-white underline">
          View usage
        </Link>
      </div>
    </div>
  )
}
