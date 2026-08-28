"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { gsap } from "gsap"
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

const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power2.out",
  baseColor = "rgba(18, 15, 23, 0.85)",
  pillColor = "#ffe14d",
  hoveredPillTextColor = "#ffffff",
  pillTextColor = "#000000",
  onMobileMenuClick,
  initialLoadAnimation = false,
}) => {
  const pathname = usePathname()
  const resolvedPillTextColor = pillTextColor ?? "#000000"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentActive, setCurrentActive] = useState<string | undefined>(activeHref)
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([])
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([])
  const logoImgRef = useRef<HTMLImageElement | null>(null)
  const logoTweenRef = useRef<gsap.core.Tween | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const navItemsRef = useRef<HTMLDivElement | null>(null)
  const logoRef = useRef<HTMLAnchorElement | HTMLElement | null>(null)

  // Track active section/route
  useEffect(() => {
    if (activeHref !== undefined) {
      setCurrentActive(activeHref)
      return
    }

    if (pathname === "/") {
      const handleScroll = () => {
        const hashItems = items.filter((item) => item.href.startsWith("#"))
        for (const item of hashItems) {
          const el = document.getElementById(item.href.substring(1))
          if (el) {
            const rect = el.getBoundingClientRect()
            if (rect.top <= 200 && rect.bottom >= 200) {
              setCurrentActive(item.href)
              return
            }
          }
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true })
      handleScroll()
      return () => window.removeEventListener("scroll", handleScroll)
    } else {
      setCurrentActive(pathname)
    }
  }, [activeHref, pathname, items])

  // GSAP Pill Animation Setup
  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return

        const pill = circle.parentElement as HTMLElement
        const rect = pill.getBoundingClientRect()
        const { width: w, height: h } = rect
        if (w === 0 || h === 0) return

        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 2
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
        const originY = D - delta

        circle.style.width = `${D}px`
        circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        })

        const label = pill.querySelector<HTMLElement>(".pill-label")
        const white = pill.querySelector<HTMLElement>(".pill-label-hover")

        if (label) gsap.set(label, { y: 0 })
        if (white) gsap.set(white, { y: h + 12, opacity: 0 })

        const index = circleRefs.current.indexOf(circle)
        if (index === -1) return

        tlRefs.current[index]?.kill()
        const tl = gsap.timeline({ paused: true })

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.25, ease, overwrite: "auto" }, 0)

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 0.25, ease, overwrite: "auto" }, 0)
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 8), opacity: 0 })
          tl.to(white, { y: 0, opacity: 1, duration: 0.25, ease, overwrite: "auto" }, 0)
        }

        tlRefs.current[index] = tl
      })
    }

    layout()

    const onResize = () => layout()
    window.addEventListener("resize", onResize)

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {})
    }

    const menu = mobileMenuRef.current
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 0.95 })
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current
      const navItems = navItemsRef.current

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 })
        gsap.to(logoEl, { scale: 1, duration: 0.4, ease })
      }

      if (navItems) {
        gsap.set(navItems, { opacity: 0, y: -10 })
        gsap.to(navItems, { opacity: 1, y: 0, duration: 0.4, ease })
      }
    }

    return () => window.removeEventListener("resize", onResize)
  }, [items, ease, initialLoadAnimation])

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.22,
      ease,
      overwrite: "auto",
    })
  }

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.18,
      ease,
      overwrite: "auto",
    })
  }

  const handleLogoEnter = () => {
    const img = logoImgRef.current
    if (!img) return
    logoTweenRef.current?.kill()
    gsap.set(img, { rotate: 0 })
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    })
  }

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const newState = !prev
      const hamburger = hamburgerRef.current
      const menu = mobileMenuRef.current

      if (hamburger) {
        const lines = hamburger.querySelectorAll(".hamburger-line")
        if (newState) {
          gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.2, ease: "power2.out" })
          gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.2, ease: "power2.out" })
        } else {
          gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.2, ease: "power2.out" })
          gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.2, ease: "power2.out" })
        }
      }

      if (menu) {
        if (newState) {
          gsap.set(menu, { visibility: "visible" })
          gsap.fromTo(
            menu,
            { opacity: 0, y: -8, scaleY: 0.96 },
            { opacity: 1, y: 0, scaleY: 1, duration: 0.25, ease: "power2.out", transformOrigin: "top center" }
          )
        } else {
          gsap.to(menu, {
            opacity: 0,
            y: -8,
            scaleY: 0.96,
            duration: 0.18,
            ease: "power2.in",
            transformOrigin: "top center",
            onComplete: () => {
              gsap.set(menu, { visibility: "hidden" })
            },
          })
        }
      }

      return newState
    })

    onMobileMenuClick?.()
  }, [onMobileMenuClick])

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    setIsMobileMenuOpen(false)
    const menu = mobileMenuRef.current
    if (menu) {
      gsap.to(menu, {
        opacity: 0,
        y: -8,
        duration: 0.15,
        onComplete: () => {
          gsap.set(menu, { visibility: "hidden" })
        },
      })
    }

    if (href.startsWith("#")) {
      e.preventDefault()
      if (pathname === "/") {
        const targetId = href.substring(1)
        const targetElement = document.getElementById(targetId)
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" })
          setCurrentActive(href)
          window.history.pushState(null, "", href)
        }
      } else {
        window.location.href = `/${href}`
      }
    } else {
      setCurrentActive(href)
    }
  }

  const isExternalLink = (href: string) =>
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")

  const isAnchorLink = (href: string) => href.startsWith("#")

  const cssVars = {
    ["--base"]: baseColor,
    ["--pill-bg"]: pillColor,
    ["--hover-text"]: hoveredPillTextColor,
    ["--pill-text"]: resolvedPillTextColor,
  } as React.CSSProperties

  const firstHref = items?.[0]?.href || "/"

  return (
    <div className={`pill-nav-container ${className}`}>
      <nav className="pill-nav" aria-label="Primary Navigation" style={cssVars}>
        {logo && (
          <div
            className="pill-logo"
            onMouseEnter={handleLogoEnter}
            ref={(el) => {
              logoRef.current = el
            }}
          >
            {typeof logo === "string" ? (
              <img src={logo} alt={logoAlt} ref={logoImgRef} />
            ) : (
              logo
            )}
          </div>
        )}

        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => {
              const isActive = currentActive === item.href

              return (
                <li key={item.href} role="none">
                  {isExternalLink(item.href) || isAnchorLink(item.href) ? (
                    <a
                      role="menuitem"
                      href={item.href}
                      className={`pill${isActive ? " is-active" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
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
                    </a>
                  ) : (
                    <Link
                      role="menuitem"
                      href={item.href}
                      prefetch={true}
                      className={`pill${isActive ? " is-active" : ""}`}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
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
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <button
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* Mobile Popover Menu */}
      <div
        className="mobile-menu-popover mobile-only"
        ref={mobileMenuRef}
        style={cssVars}
      >
        <ul className="mobile-menu-list">
          {items.map((item) => {
            const isActive = currentActive === item.href

            return (
              <li key={item.href}>
                {isExternalLink(item.href) || isAnchorLink(item.href) ? (
                  <a
                    href={item.href}
                    className={`mobile-menu-link${isActive ? " is-active" : ""}`}
                    onClick={(e) => handleLinkClick(e, item.href)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    prefetch={true}
                    className={`mobile-menu-link${isActive ? " is-active" : ""}`}
                    onClick={(e) => handleLinkClick(e, item.href)}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default PillNav
