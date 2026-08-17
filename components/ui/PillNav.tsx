"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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

  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([])
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([])
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
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

  // GSAP layout & hover timelines calculation
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

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.4, ease, overwrite: "auto" }, 0)

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 0.4, ease, overwrite: "auto" }, 0)
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 12), opacity: 0 })
          tl.to(white, { y: 0, opacity: 1, duration: 0.4, ease, overwrite: "auto" }, 0)
        }

        tlRefs.current[index] = tl
      })
    }

    // Run layout calculation after render
    const timer = setTimeout(layout, 50)

    const onResize = () => layout()
    window.addEventListener("resize", onResize)

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {})
    }

    const menu = mobileMenuRef.current
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0 })
    }

    if (initialLoadAnimation && navItemsRef.current) {
      gsap.fromTo(
        navItemsRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease }
      )
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", onResize)
      tlRefs.current.forEach((tl) => tl?.kill())
      activeTweenRefs.current.forEach((tw) => tw?.kill())
    }
  }, [items, ease, initialLoadAnimation])

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    })
  }

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.25,
      ease,
      overwrite: "auto",
    })
  }

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)

    const hamburger = hamburgerRef.current
    const menu = mobileMenuRef.current

    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line")
      if (lines.length >= 2) {
        if (newState) {
          gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease })
          gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease })
        } else {
          gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease })
          gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease })
        }
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: "visible" })
        gsap.fromTo(
          menu,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.3, ease }
        )
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: -10,
          duration: 0.2,
          ease,
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" })
          },
        })
      }
    }

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

        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
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
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
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
          </ul>
        </div>

        <button
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      <div
        className="mobile-menu-popover mobile-only"
        ref={mobileMenuRef}
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
