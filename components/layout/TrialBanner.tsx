"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Clock } from "lucide-react"

export function TrialBanner({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const [dismissed, setDismissed] = useState(true)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem("trial_banner_dismissed") === "true") {
      return
    }

    if (plan !== "trial" || !trialEndsAt) {
      return
    }

    const end = new Date(trialEndsAt).getTime()
    const now = Date.now()
    const diff = end - now

    if (diff > 0) {
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      setDaysRemaining(days)
      setDismissed(false)
    }
  }, [plan, trialEndsAt])

  if (dismissed || plan !== "trial" || daysRemaining === null) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem("trial_banner_dismissed", "true")
  }

  return (
    <div className="h-9 bg-[var(--s2)] border-b border-[var(--line)] text-[var(--t2)] px-4 flex items-center justify-between text-[12px] select-none z-20 relative">
      <div className="flex items-center gap-2 mx-auto">
        <Clock className="size-3.5 text-[var(--t3)] shrink-0" />
        <span>
          Your trial has <strong className="font-mono text-[var(--t1)]">{daysRemaining} {daysRemaining === 1 ? "day" : "days"}</strong> remaining.
        </span>
        <Link
          href="/dashboard/billing"
          className="ms-2 px-2.5 py-0.5 rounded-[4px] bg-[var(--s3)] border border-[var(--line2)] text-[var(--t1)] hover:bg-[var(--s4)] transition-colors text-[11.5px] font-medium"
        >
          Choose a plan
        </Link>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss trial banner"
        className="size-5 rounded-[4px] hover:bg-[var(--s3)] text-[var(--t3)] hover:text-[var(--t1)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
