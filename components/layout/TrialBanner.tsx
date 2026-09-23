"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export function TrialBanner({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const router = useRouter()
  const { t } = useLanguage()
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
    <div className="bg-[#111318]/95 backdrop-blur-md border-b border-[#e5a93c]/20 text-zinc-300 py-2 px-4 text-xs sm:text-sm font-medium z-40 relative flex flex-wrap items-center justify-center gap-3 w-full shadow-md">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#e5a93c] animate-pulse" />
        {t.trialExpiresIn}{" "}
        <span className="font-mono bg-[#e5a93c]/10 text-[#f3ba4f] border border-[#e5a93c]/25 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums">
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      </span>
      <a 
        href="/dashboard/billing" 
        className="inline-flex items-center gap-1 bg-[#e5a93c] hover:bg-[#d4952b] text-black text-xs font-bold px-3 py-1 rounded-full transition-all shadow-sm"
      >
        <span>{t.upgradeNow}</span>
        <span aria-hidden="true">&rarr;</span>
      </a>
    </div>
  )
}
