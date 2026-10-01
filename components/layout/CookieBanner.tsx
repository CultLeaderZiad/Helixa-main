"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Cookie } from "lucide-react"

const CONSENT_KEY = "helixa-cookie-consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY)
      if (!stored) {
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable — don't nag
    }
  }, [])

  const choose = (choice: "accepted" | "rejected") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, at: new Date().toISOString() }))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-4 start-4 end-4 sm:end-auto sm:max-w-md z-[60] rounded-2xl border border-white/10 bg-[#0c0d12]/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5 motion-fade-in-up"
    >
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-[#e5a93c] shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white mb-1">Cookies</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            We only use essential cookies (to keep you signed in) plus one optional cookie that remembers your
            language. No ads, no trackers. Details in our{" "}
            <Link href="/cookies" className="text-[#e5a93c] hover:underline">Cookie Policy</Link>.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="px-4 py-1.5 rounded-lg bg-[#e5a93c] hover:bg-[#d4952b] text-black text-xs font-bold transition-colors cursor-pointer"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => choose("rejected")}
              className="px-4 py-1.5 rounded-lg border border-white/15 text-neutral-300 hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
            >
              Reject optional
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner
