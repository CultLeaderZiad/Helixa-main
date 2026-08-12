"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function TrialBanner({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null)

  useEffect(() => {
    if (plan === "expired") {
      router.push("/dashboard/billing")
      return
    }

    if (plan !== "trial" || !trialEndsAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const end = new Date(trialEndsAt).getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft(null)
        router.push("/dashboard/billing")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    // Initial call
    updateTimer()
    
    // Update every second
    const intervalId = setInterval(updateTimer, 1000)
    
    return () => clearInterval(intervalId)
  }, [plan, trialEndsAt, router])

  if (plan !== "trial" || !timeLeft) {
    return null
  }

  return (
    <div className="bg-[#ffe14d] text-black text-center py-2 px-4 text-sm font-bold font-mono-ui z-50 relative flex items-center justify-center gap-4">
      <span>
        Trial expires in:{" "}
        <span className="font-mono bg-black/10 px-2 py-0.5 rounded ml-1">
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      </span>
      <a href="/dashboard/billing" className="underline hover:no-underline text-blue-800 hover:text-black transition-colors">
        Upgrade now
      </a>
    </div>
  )
}
