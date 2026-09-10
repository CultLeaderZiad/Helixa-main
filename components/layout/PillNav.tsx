"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import "./PillNav.css"

export type PillNavItem = {
  label: string
  href: string
  ariaLabel?: string
  isPrimary?: boolean
}

export interface PillNavProps {
  logo?: string
  logoText?: string
  logoAlt?: string
  items?: PillNavItem[]
  activeHref?: string
  className?: string
  onMobileMenuClick?: () => void
}

export function PillNav({
  logo = "/helix-logo.svg",
  logoText = "HLX",
  logoAlt = "Helix Auto DM Logo",
  items,
  activeHref,
  className = "",
  onMobileMenuClick,
}: PillNavProps) {
  const pathname = usePathname()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const ctaCircleRef = useRef<HTMLSpanElement | null>(null)
  const langCircleRef = useRef<HTMLSpanElement | null>(null)

  const defaultItems: PillNavItem[] = [
    { label: t.features || "Features", href: "/#features" },
    { label: t.howItWorks || "How It Works", href: "/#how" },
    { label: t.pricing || "Pricing", href: "/pricing" },
    { label: t.updates || "Updates", href: "/updates" },
    { label: t.faq || "FAQ", href: "/faq" },
  ]
  const effectiveItems = items || defaultItems

  // Current active path or hash
  const currentActive = activeHref || pathname || "/"

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ar" : "en")
  }, [language, setLanguage])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Calculate geometric bubble origin on pills
  useEffect(() => {
    const layout = () => {
      const allCircles = [...circleRefs.current, ctaCircleRef.current, langCircleRef.current]
      allCircles.forEach((circle) => {
        if (!circle?.parentElement) return
        const pill = circle.parentElement as HTMLElement
        const rect = pill.getBoundingClientRect()
        const { width: w, height: h } = rect
        if (w === 0 || h === 0) return
        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 4
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 2
        const originY = D - delta

        circle.style.width = `${D}px`
        circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`
        circle.style.transformOrigin = `50% ${originY}px`
      })
    }

    layout()
    window.addEventListener("resize", layout)
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {})
    }
    return () => window.removeEventListener("resize", layout)
  }, [items, language])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
    onMobileMenuClick?.()
  }, [onMobileMenuClick])

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMobileMenuOpen(false)
    if (href.startsWith("#") || (href.startsWith("/#") && pathname === "/")) {
      const hash = href.includes("#") ? `#${href.split("#")[1]}` : href
      const el = document.querySelector(hash)
      if (el) {
        e.preventDefault()
        const offset = 80
        const bodyRect = document.body.getBoundingClientRect().top
        const elementRect = el.getBoundingClientRect().top
        const elementPosition = elementRect - bodyRect
        const offsetPosition = elementPosition - offset
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
      }
    }
  }, [pathname])

  const isActiveLink = (href: string) => {
    if (href === currentActive) return true
    if (href !== "/" && href !== "/#features" && href !== "/#how" && currentActive.startsWith(href)) return true
    return false
  }

  const nextLangLabel = language === "en" ? "AR" : "EN"

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label="Primary">
        {/* Left: HLX Logo with App Icon */}
        <Link
          href="/"
          className="pill-logo"
          aria-label="Helix Auto DM Home"
          id="pillLogo"
          onClick={(e) => handleLinkClick(e, "/")}
        >
          {logo && <img src={logo} alt={logoAlt} className="pill-logo-icon" />}
          <span className="pill-logo-text">{logoText}</span>
        </Link>

        {/* Center: Desktop Navigation Items Track */}
        <div className="pill-nav-items desktop-only" id="navItems">
          <ul className="pill-list" role="menubar">
            {effectiveItems.map((item, i) => {
              const active = isActiveLink(item.href)

              return (
                <li key={item.href} role="none">
                  <Link
                    href={item.href}
                    className={`pill ${active ? "is-active" : ""}`}
                    aria-label={item.ariaLabel || item.label}
                    role="menuitem"
                    onClick={(e) => handleLinkClick(e, item.href)}
                  >
                    <span
                      className="hover-circle"
                      aria-hidden="true"
                      ref={(el) => {
                        circleRefs.current[i] = el
                      }}
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

            {/* Desktop Start Build Silver CTA */}
            <li role="none" style={{ marginLeft: "1.25rem" }}>
              <Link
                href="/signup"
                className="pill pill-silver"
                role="menuitem"
                aria-label={t.startBuild || "Start Build"}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="hover-circle" aria-hidden="true" ref={ctaCircleRef} />
                <span className="label-stack">
                  <span className="pill-label">
                    {t.startBuild || "Start Build"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                  <span className="pill-label-hover" aria-hidden="true">
                    {t.startBuild || "Start Build"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </span>
              </Link>
            </li>

            {/* Desktop Language Switcher Pill */}
            <li role="none" style={{ marginLeft: "0.5rem" }}>
              <button
                type="button"
                className="pill pill-lang"
                role="menuitem"
                onClick={toggleLanguage}
                aria-label={`Switch to ${nextLangLabel}`}
                title={`Switch to ${language === "en" ? "Arabic" : "English"}`}
              >
                <span className="hover-circle" aria-hidden="true" ref={langCircleRef} />
                <span className="label-stack">
                  <span className="pill-label">{nextLangLabel}</span>
                  <span className="pill-label-hover" aria-hidden="true">
                    {nextLangLabel}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        {/* Mobile: Start Build CTA shown directly in nav */}
        <Link href="/signup" className="mobile-nav-cta" onClick={() => setIsMobileMenuOpen(false)}>
          <span>{t.startBuild || "Start Build"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Mobile: Right Actions (Language + Hamburger) */}
        <div className="mobile-right-actions">
          <button
            type="button"
            className="mobile-lang-btn"
            onClick={toggleLanguage}
            aria-label={`Switch to ${nextLangLabel}`}
          >
            {nextLangLabel}
          </button>

          <button
            type="button"
            id="hamburgerBtn"
            className={`mobile-menu-button ${isMobileMenuOpen ? "is-open" : ""}`}
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </nav>

      {/* Mobile Popover Menu */}
      <div className={`mobile-menu-popover mobile-only ${isMobileMenuOpen ? "is-open" : ""}`}>
        <ul className="mobile-menu-list">
          {effectiveItems.map((item) => {
            const active = isActiveLink(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`mobile-menu-link ${active ? "is-active" : ""}`}
                  onClick={(e) => handleLinkClick(e, item.href)}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
          <li>
            <Link
              href="/signup"
              className="mobile-menu-link is-cta"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>{t.startBuild || "Start Build"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default PillNav
