"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 end-6 z-40 p-3 rounded-full bg-white/10 border border-white/15 text-white backdrop-blur-md hover:bg-white/20 hover:border-[#e5a93c]/50 transition-all shadow-xl cursor-pointer motion-fade-in"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  )
}

export default BackToTop
