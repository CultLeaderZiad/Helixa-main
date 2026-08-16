"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

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
  const [currentActive, setCurrentActive] = useState<string | null>(activeHref || null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // If activeHref is explicitly provided, respect it
    if (activeHref !== undefined) {
      setCurrentActive(activeHref)
      return
    }

    // Set up intersection observer for hash links
    const hashItems = items.filter(item => item.href.startsWith('#'))
    if (hashItems.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      let maxRatio = 0
      let activeId = null

      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio
          activeId = `#${entry.target.id}`
        }
      })

      if (activeId) {
        setCurrentActive(activeId)
      }
    }, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    })

    hashItems.forEach(item => {
      const element = document.getElementById(item.href.substring(1))
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [items, activeHref])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const element = document.getElementById(href.substring(1))
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        setCurrentActive(href)
        // Optionally update URL hash without jump
        window.history.pushState(null, '', href)
      }
    }
  }

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
          // Fallback to pathname matching if no hash matches
          const isActive = currentActive === item.href || (!currentActive && pathname === item.href)
          
          // Determine text color based on hover and active state
          // When a tab has the white pill behind it, text should be black
          const hasPillBehind = isHovered || (isActive && hoveredHref === null)
          const textColor = hasPillBehind ? pillTextColor : hoveredPillTextColor

          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
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
