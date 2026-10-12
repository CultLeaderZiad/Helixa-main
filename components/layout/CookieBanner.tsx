"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Cookie } from "lucide-react"

const CONSENT_KEY = "helixa-cookie-notice-dismissed"

export function CookieBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on public pages, never inside dashboard
    if (pathname?.startsWith("/dashboard")) {
      setVisible(false)
      return
    }

    try {
      const dismissed = window.localStorage.getItem(CONSENT_KEY)
      if (!dismissed) {
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable — don't nag
    }
  }, [pathname])

  const dismiss = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, "true")
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible || pathname?.startsWith("/dashboard")) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-4 start-4 end-4 sm:end-auto sm:max-w-md z-[60] rounded-xl border border-[var(--line2,#2C2C33)] bg-[var(--s2,#151519)]/95 backdrop-blur-xl shadow-xl p-3 sm:p-4 motion-fade-in-up"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-[var(--t2,#A3A3AD)]">
          <Cookie className="w-4 h-4 text-[var(--t3,#7A7A85)] shrink-0" />
          <span>
            Essential cookies only.{" "}
            <Link href="/cookies" className="text-[var(--t1,#EDEDEF)] underline hover:text-white">
              Cookie Policy
            </Link>
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export default CookieBanner
