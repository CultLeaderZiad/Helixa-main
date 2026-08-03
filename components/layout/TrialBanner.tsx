"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function TrialBanner({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const router = useRouter()
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (plan === "trial" && trialEndsAt) {
      const now = new Date().getTime()
      const end = new Date(trialEndsAt).getTime()
      const diff = end - now
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (days <= 0) {
        router.push("/pricing")
      } else {
        setDaysLeft(days)
      }
    } else if (plan === "expired") {
      router.push("/pricing")
    }
  }, [plan, trialEndsAt, router])

  if (plan !== "trial" || daysLeft === null || daysLeft <= 0) {
    return null
  }

  return (
    <div className="bg-[#ffe14d] text-black text-center py-2 px-4 text-sm font-bold font-mono-ui z-50 relative">
      Trial expires in {daysLeft} {daysLeft === 1 ? "day" : "days"}.{" "}
      <a href="/pricing" className="underline hover:no-underline ml-2">
        Upgrade now
      </a>
    </div>
  )
}
