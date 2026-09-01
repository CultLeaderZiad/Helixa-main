"use client"

import { useState, useRef, useEffect, useCallback, ReactNode } from "react"
import Link from "next/link"
import "./PillNav.css"

export type PillNavItem = {
  label: string
  href: string
  ariaLabel?: string
  isPrimary?: boolean
}

export interface PillNavProps {
  logo: string
  logoAlt?: string
  items: PillNavItem[]
  activeHref?: string
  className?: string
  baseColor?: string
  pillColor?: string
  hoverCircleColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  onMobileMenuClick?: () => void
  initialLoadAnimation?: boolean
  sticky?: boolean
  stickyScrollThreshold?: number
  rightSlot?: ReactNode
}

export function PillNav({
  logo,
  logoAlt = "Logo",
  items = [],
  activeHref,
  className = "",
  baseColor = "#0c0d0e",
  pillColor = "#181a1b",
  hoverCircleColor = "#ffe14d",
  hoveredPillTextColor = "#000000",
  pillTextColor = "#ffffff",
  onMobileMenuClick,
  initialLoadAnimation = true,
  sticky = false,
  stickyScrollThreshold = 100,
  rightSlot,
}: PillNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isStickyVisible, setIsStickyVisible] = useState(false)
  const [isScrolledPast, setIsScrolledPast] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (initialLoadAnimation && !hasAnimated) {
      setHasAnimated(true)
    }
  }, [initialLoadAnimation, hasAnimated])

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return
        const pill = circle.parentElement as HTMLElement
        const rect = pill.getBoundingClientRect()
        const { width: w, height: h } = rect
        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 2
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
        const originY = D - delta
        circle.style.width = `${D}px`
        circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`
        circle.style.setProperty("--origin-y", `${originY}px`)
      })
    }

    layout()
    const onResize = () => layout()
    window.addEventListener("resize", onResize)
    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {})
    }
    return () => window.removeEventListener("resize", onResize)
  }, [items])

  // Sticky scroll behavior
  useEffect(() => {
    if (!sticky) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > stickyScrollThreshold) {
        setIsScrolledPast(true)
        if (currentScrollY < lastScrollY.current) {
          setIsStickyVisible(true)
        } else if (currentScrollY > lastScrollY.current + 10) {
          setIsStickyVisible(false)
          setIsMobileMenuOpen(false)
        }
      } else {
        setIsScrolledPast(false)
        setIsStickyVisible(false)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sticky, stickyScrollThreshold])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    onMobileMenuClick?.()
  }, [isMobileMenuOpen, onMobileMenuClick])

  const handleHashClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        const headerOffset = 80
        const elementPosition = target.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - headerOffset
        window.scrollTo({ top: offsetPosition, behavior: "smooth" })
      }
      setIsMobileMenuOpen(false)
    }
  }, [])

  const isExternalLink = (href: string) =>
    href &&
    (href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#"))

  const isRouterLink = (href?: string) => href && !isExternalLink(href)

  const cssVars = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-circle": hoverCircleColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": pillTextColor,
  } as React.CSSProperties

  const navContent = (
    <div className={`pill-nav-container ${hasAnimated ? "pill-nav-animate" : ""}`}>
      <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
        {/* Logo — positioned absolutely left on desktop, in-flow on mobile */}
        <div className="pill-logo-wrap">
          {isRouterLink(items?.[0]?.href) ? (
            <Link className="pill-logo" href={items[0].href} aria-label="Home">
              <img src={logo} alt={logoAlt} />
            </Link>
          ) : (
            <a className="pill-logo" href={items?.[0]?.href || "#"} aria-label="Home">
              <img src={logo} alt={logoAlt} />
            </a>
          )}
        </div>

        {/* Pill items — absolutely centered on desktop */}
        <div className="pill-nav-items-wrap desktop-only">
          <div className="pill-nav-items">
            <ul className="pill-list" role="menubar">
              {items.map((item, i) => (
                <li key={item.href} role="none">
                  {isRouterLink(item.href) ? (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={`pill${activeHref === item.href ? " is-active" : ""}${item.isPrimary ? " pill-primary" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                    >
                      <span className="hover-circle" aria-hidden="true" ref={(el) => { circleRefs.current[i] = el }} />
                      <span className="label-stack">
                        <span className="pill-label">{item.label}</span>
                        <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
                      </span>
                    </Link>
                  ) : (
                    <a
                      role="menuitem"
                      href={item.href}
                      className={`pill${activeHref === item.href ? " is-active" : ""}${item.isPrimary ? " pill-primary" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                      onClick={(e) => handleHashClick(e, item.href)}
                    >
                      <span className="hover-circle" aria-hidden="true" ref={(el) => { circleRefs.current[i] = el }} />
                      <span className="label-stack">
                        <span className="pill-label">{item.label}</span>
                        <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right slot — positioned absolutely right on desktop */}
        {rightSlot && <div className="pill-nav-right-wrap desktop-only">{rightSlot}</div>}

        {/* Mobile Menu Button — shown on right side on mobile */}
        <button
          className={`mobile-menu-button mobile-only${isMobileMenuOpen ? " is-open" : ""}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* Mobile Menu Popover */}
      <div className={`mobile-menu-popover mobile-only${isMobileMenuOpen ? " is-open" : ""}`} style={cssVars}>
        <ul className="mobile-menu-list">
          {items.map((item) => (
            <li key={item.href}>
              {isRouterLink(item.href) ? (
                <Link
                  href={item.href}
                  className={`mobile-menu-link${activeHref === item.href ? " is-active" : ""}${item.isPrimary ? " is-primary" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className={`mobile-menu-link${activeHref === item.href ? " is-active" : ""}${item.isPrimary ? " is-primary" : ""}`}
                  onClick={(e) => { handleHashClick(e, item.href); setIsMobileMenuOpen(false) }}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
          {rightSlot && (
            <li className="mobile-language-switcher">{rightSlot}</li>
          )}
        </ul>
      </div>
    </div>
  )

  if (sticky) {
    return (
      <div className={`pill-nav-sticky ${isScrolledPast ? (isStickyVisible ? "pill-nav-visible" : "pill-nav-hidden") : ""}`}>
        {navContent}
      </div>
    )
  }

  return navContent
}

export default PillNav
