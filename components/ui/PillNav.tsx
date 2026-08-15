"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

interface NavItem {
  label: string
  href: string
}

interface PillNavProps {
  logo?: React.ReactNode
  logoAlt?: string
  items: NavItem[]
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
}

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power2.easeOut",
  baseColor = "#000000",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#ffffff",
  pillTextColor = "#000000"
}: PillNavProps) {
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  return (
    <nav 
      className={`flex items-center p-1.5 rounded-full ${className}`} 
      style={{ backgroundColor: baseColor }}
      onMouseLeave={() => setHoveredHref(null)}
    >
      {logo && (
        <div className="pl-1.5 pr-2 py-0.5 flex items-center justify-center">
          {logo}
        </div>
      )}
      <div className="flex items-center">
        {items.map((item) => {
          const isHovered = hoveredHref === item.href
          const isActive = activeHref === item.href
          
          // Determine text color based on hover and active state
          // When a tab has the white pill behind it, text should be black
          const hasPillBehind = isHovered || (isActive && hoveredHref === null)
          const textColor = hasPillBehind ? pillTextColor : hoveredPillTextColor

          return (
            <Link 
              key={item.href} 
              href={item.href}
              onMouseEnter={() => setHoveredHref(item.href)}
              className="relative px-6 py-2.5 rounded-full transition-colors z-10 font-bold tracking-widest text-xs uppercase"
              style={{ color: textColor }}
            >
              {hasPillBehind && (
                <motion.div
                  layoutId="pill-nav-background"
                  className="absolute inset-0 rounded-full -z-10"
                  style={{ backgroundColor: pillColor }}
                  initial={false}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 35 
                  }}
                />
              )}
              <span className="relative z-20">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
