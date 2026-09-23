"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Animates a numeric value from its previous value to the next with an
 * ease-out curve. Used by dashboard stat cards for that "premium" feel.
 * Respects prefers-reduced-motion (jumps straight to the final value).
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = target
    prevRef.current = target

    if (from === to) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return display
}
