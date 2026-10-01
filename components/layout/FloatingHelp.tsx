"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageCircleQuestion, X, Send, Mail } from "lucide-react"

/**
 * Floating "Get Help" affordance for the dashboard.
 * Expands into quick support options without navigating away from the current page.
 */
export function FloatingHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 end-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Get help options"
          className="w-64 rounded-2xl border border-white/10 bg-[#0c0d12]/95 backdrop-blur-xl shadow-2xl p-4 motion-fade-in-up"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-white">Get Help</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help menu"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
            Stuck on something? We usually reply within a few hours.
          </p>
          <div className="space-y-2">
            <a
              href="https://t.me/cultleaderziad"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-neutral-200 hover:bg-white/10 hover:border-[#2AABEE]/40 transition-colors"
            >
              <Send className="w-4 h-4 text-[#2AABEE]" />
              Telegram support
            </a>
            <a
              href="mailto:cultleaderzoz.dev@gmail.com"
              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-neutral-200 hover:bg-white/10 hover:border-[#e5a93c]/40 transition-colors"
            >
              <Mail className="w-4 h-4 text-[#e5a93c]" />
              Email us
            </a>
            <Link
              href="/faq"
              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-neutral-200 hover:bg-white/10 transition-colors"
            >
              <MessageCircleQuestion className="w-4 h-4 text-neutral-400" />
              Browse FAQ
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close help menu" : "Get help"}
        className="flex items-center gap-2 p-3.5 rounded-full bg-[#e5a93c] text-black shadow-[0_0_20px_rgba(229,169,60,0.35)] hover:bg-[#d4952b] transition-all cursor-pointer"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircleQuestion className="w-5 h-5" />}
      </button>
    </div>
  )
}

export default FloatingHelp
