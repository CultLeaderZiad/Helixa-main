"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import "./PillNav.css"

export type PillNavItem = {
  label: string
  href: string
  ariaLabel?: string
}

export interface PillNavProps {
  logo?: string | React.ReactNode
  logoAlt?: string
  items: PillNavItem[]
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  onMobileMenuClick?: () => void
  initialLoadAnimation?: boolean
}

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items = [],
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "rgba(255, 255, 255, 0.05)",
  pillColor = "#ffe14d",
  hoveredPillTextColor = "#000000",
  pillTextColor = "#ffffff",
  onMobileMenuClick,
  initialLoadAnimation = false,
}: PillNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentActive, setCurrentActive] = useState<string | null>(activeHref || null)

  const navItemsRef = useRef<HTMLDivElement | null>(null)

  // Sync active href based on props or pathname or intersection observer
  useEffect(() => {
    if (activeHref !== undefined) {
      setCurrentActive(activeHref)
      return
    }

    // Set up intersection observer for hash links when on homepage
    if (pathname === "/") {
      const hashItems = items.filter((item) => item.href.startsWith("#"))
      if (hashItems.length > 0) {
        const observer = new IntersectionObserver(
          (entries) => {
            let maxRatio = 0
            let activeId: string | null = null

            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio
                activeId = `#${entry.target.id}`
              }
            })

            if (activeId) {
              setCurrentActive(activeId)
            }
          },
          {
            rootMargin: "-20% 0px -60% 0px",
            threshold: [0, 0.25, 0.5, 0.75, 1],
          }
        )

        hashItems.forEach((item) => {
          const el = document.getElementById(item.href.substring(1))
          if (el) observer.observe(el)
        })

        return () => observer.disconnect()
      }
    }
  }, [items, activeHref, pathname])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    onMobileMenuClick?.()
  }

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    itemHref: string
  ) => {
    let targetHref = itemHref
    if (targetHref.startsWith("#") && pathname !== "/") {
      targetHref = `/${targetHref}`
    }

    const isLocalHash = targetHref.startsWith("#") && pathname === "/"
    const isRootHash = targetHref.startsWith("/#") && pathname === "/"

    if (isLocalHash || isRootHash) {
      e.preventDefault()
      const hash = isRootHash ? targetHref.substring(1) : targetHref
      const elementId = hash.substring(1)
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
        setCurrentActive(hash)
        window.history.pushState(null, "", hash)
      }
    } else if (targetHref.startsWith("/")) {
      setCurrentActive(itemHref)
    }
  }

  const cssVars = {
    ["--base"]: baseColor,
    ["--pill-bg"]: pillColor,
    ["--hover-text"]: hoveredPillTextColor,
    ["--pill-text"]: pillTextColor,
    ["--hover-bg"]: pillColor,
  } as React.CSSProperties

  return (
    <div className={`pill-nav-container ${className}`}>
      <nav className="pill-nav" aria-label="Primary" style={cssVars}>
        {logo && (
          <div className="pill-logo mr-2">
            {typeof logo === "string" ? (
              <img src={logo} alt={logoAlt} />
            ) : (
              logo
            )}
          </div>
        )}

        <div className={`pill-nav-items desktop-only ${initialLoadAnimation ? "initial-load" : ""}`} ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => {
              let targetHref = item.href
              if (targetHref.startsWith("#") && pathname !== "/") {
                targetHref = `/${targetHref}`
              }
              const isActive =
                currentActive === item.href ||
                (!currentActive && pathname === item.href)

              return (
                <li key={item.href} role="none">
                  <Link
                    role="menuitem"
                    href={targetHref}
                    className={`pill${isActive ? " is-active" : ""}`}
                    aria-label={item.ariaLabel || item.label}
                    onClick={(e) => handleNavClick(e, item.href)}
                  >
                    <span
                      className="hover-circle"
                      aria-hidden="true"
                    />
                    <span className="label-stack">
                      <span className="pill-label">{item.label}</span>
                      <span className="pill-label-hover" aria-hidden="true">
                        {item.label}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <button
          className={`mobile-menu-button mobile-only ${isMobileMenuOpen ? "is-open" : ""}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      <div
        className={`mobile-menu-popover mobile-only ${isMobileMenuOpen ? "is-open" : ""}`}
        style={cssVars}
      >
        <ul className="mobile-menu-list">
          {items.map((item) => {
            let targetHref = item.href
            if (targetHref.startsWith("#") && pathname !== "/") {
              targetHref = `/${targetHref}`
            }
            const isActive =
              currentActive === item.href ||
              (!currentActive && pathname === item.href)

            return (
              <li key={item.href}>
                <Link
                  href={targetHref}
                  className={`mobile-menu-link${isActive ? " is-active" : ""}`}
                  onClick={(e) => {
                    setIsMobileMenuOpen(false)
                    handleNavClick(e, item.href)
                  }}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
