"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export function DeferredMount({
  children,
  delay = 1200,
}: {
  children: ReactNode
  delay?: number
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supportsIdle = typeof window !== "undefined" && "requestIdleCallback" in window
    let id: number
    if (supportsIdle) {
      id = window.requestIdleCallback(() => setShow(true), { timeout: delay })
    } else {
      id = window.setTimeout(() => setShow(true), delay)
    }
    return () => {
      if (supportsIdle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [delay])

  return show ? <>{children}</> : null
}

export function InViewMount({
  children,
  rootMargin = "200px",
}: {
  children: ReactNode
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!("IntersectionObserver" in window)) {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return <div ref={ref} className="contents">{show ? children : null}</div>
}
