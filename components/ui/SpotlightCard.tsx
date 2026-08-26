"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"

interface SpotlightCardProps {
  children: React.ReactNode
  spotlightColor?: string
  className?: string
}

export default function SpotlightCard({
  children,
  spotlightColor = "rgba(255, 255, 255, 0.06)",
  className = "",
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  // Detect touch device once
  useEffect(() => {
    setIsTouch(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(hover: none)").matches
    )
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouch) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [isTouch]
  )

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        // On touch: fixed center spotlight. On desktop: mouse-tracked
        "--spotlight-x": isTouch ? "50%" : `${position.x}px`,
        "--spotlight-y": isTouch ? "50%" : `${position.y}px`,
        "--spotlight-opacity": isHovering ? 1 : 0,
        "--spotlight-color": spotlightColor,
      } as React.CSSProperties}
    >
      {/* Spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: isTouch
            ? // Touch: radial gradient centered
              `radial-gradient(circle 300px at 50% 50%, var(--spotlight-color), transparent 70%)`
            : // Desktop: mouse-tracked
              `radial-gradient(circle 300px at var(--spotlight-x) var(--spotlight-y), var(--spotlight-color), transparent 70%)`,
        }}
      />
      {/* Content */}
      <div className="relative z-20">{children}</div>
    </div>
  )
}
