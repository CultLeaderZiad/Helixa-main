"use client"

import { useRef, useState, useEffect, useCallback } from "react"

interface PillNavItem {
  label: string
  href: string
}

interface PillNavProps {
  items: PillNavItem[]
  activeHref: string
  className?: string
}

export default function PillNav({ items, activeHref, className = "" }: PillNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const updateIndicator = useCallback(() => {
    const activeIdx = hoveredIndex ?? items.findIndex((i) => i.href === activeHref)
    const el = itemRefs.current[activeIdx]
    const container = containerRef.current
    if (!el || !container) return

    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()

    setIndicator({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    })
  }, [activeHref, hoveredIndex, items])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    const handleResize = () => updateIndicator()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateIndicator])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center rounded-full bg-[#0a0a12]/80 backdrop-blur-md border border-white/[0.06] p-[5px] shadow-[0_0_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)] ${className}`}
    >
      {/* Sliding indicator with glow */}
      <div
        className="absolute top-[5px] bottom-[5px] rounded-full bg-[#ffe14d] shadow-[0_0_12px_rgba(255,225,77,0.3),0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />

      {/* Nav items */}
      {items.map((item, i) => (
        <a
          key={item.href}
          ref={(el) => { itemRefs.current[i] = el }}
          href={item.href}
          onClick={(e) => handleClick(e, item.href)}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={`relative z-10 px-4 py-2 rounded-full font-mono-ui text-[11px] font-bold tracking-[0.08em] uppercase transition-colors duration-200 whitespace-nowrap select-none ${
            item.href === activeHref
              ? "text-black"
              : "text-neutral-500 hover:text-black"
          }`}
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}
