"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  CircleDot,
  CreditCard,
  Smile,
  Bell,
  ShieldCheck,
  Link2,
  Users,
  Shield,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react"

export interface SlideMenuItem {
  id: string
  label: string
  icon?: LucideIcon
  iconColor?: string
  href?: string
  badge?: string
  badgeColor?: "green" | "amber" | "neutral"
  isDestructive?: boolean
  children?: SlideMenuItem[]
  onClick?: () => void
}

export const SETTINGS_SLIDE_ITEMS: SlideMenuItem[] = [
  {
    id: "general",
    label: "General",
    icon: CircleDot,
    href: "/dashboard/settings",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    href: "/dashboard/billing",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Smile,
    href: "/dashboard/settings/appearance",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/settings/notifications",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    children: [
      {
        id: "2fa",
        label: "Password & 2FA",
        icon: ShieldCheck,
        iconColor: "text-[var(--gold)]",
        badge: "On",
        badgeColor: "green",
        href: "/dashboard/settings/security",
      },
      {
        id: "sessions",
        label: "Sessions",
        icon: Users,
        badge: "3",
        badgeColor: "neutral",
        href: "/dashboard/settings/security",
      },
      {
        id: "api-keys",
        label: "API keys",
        icon: Link2,
        href: "/dashboard/settings/api-keys",
      },
      {
        id: "audit-log",
        label: "Audit log",
        icon: Shield,
        href: "/dashboard/settings/audit-log",
      },
      {
        id: "sign-out-everywhere",
        label: "Sign out everywhere",
        icon: LogOut,
        isDestructive: true,
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/api/auth/logout"
          }
        },
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Link2,
    href: "/dashboard/integrations",
  },
]

export interface SlideMenuProps {
  items?: SlideMenuItem[]
  title?: string
  className?: string
  onClose?: () => void
  onItemSelect?: (item: SlideMenuItem) => void
}

export function SlideMenu({
  items = SETTINGS_SLIDE_ITEMS,
  title = "Settings",
  className,
  onClose,
  onItemSelect,
}: SlideMenuProps) {
  const router = useRouter()
  // Stack of nested menus: [current items, parent items, ...]
  const [navStack, setNavStack] = useState<
    Array<{ title: string; items: SlideMenuItem[]; icon?: LucideIcon }>
  >([{ title, items, icon: SlidersHorizontal }])

  const [slideDirection, setSlideDirection] = useState<"forward" | "backward" | null>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  const currentLevel = navStack[navStack.length - 1]
  const isNested = navStack.length > 1

  // Slide forward into child menu
  const handlePush = useCallback((item: SlideMenuItem) => {
    if (item.children && item.children.length > 0) {
      setSlideDirection("forward")
      setNavStack((prev) => [
        ...prev,
        { title: item.label, items: item.children!, icon: item.icon },
      ])
    }
  }, [])

  // Slide backward
  const handlePop = useCallback(() => {
    if (navStack.length > 1) {
      setSlideDirection("backward")
      setNavStack((prev) => prev.slice(0, prev.length - 1))
    }
  }, [navStack.length])

  // Reset slide animation state after 140ms
  useEffect(() => {
    if (!slideDirection) return
    const timer = setTimeout(() => {
      setSlideDirection(null)
    }, 140)
    return () => clearTimeout(timer)
  }, [slideDirection])

  // Focus management: move focus to first item on menu slide
  useEffect(() => {
    const firstButton = menuContainerRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"], button, a'
    )
    firstButton?.focus()
  }, [navStack.length])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const focusable = menuContainerRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], button:not([disabled]), a[href]'
      )
      if (!focusable || focusable.length === 0) return
      const list = Array.from(focusable)
      const currentIndex = list.indexOf(document.activeElement as HTMLElement)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const next = currentIndex < list.length - 1 ? currentIndex + 1 : 0
        list[next]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prev = currentIndex > 0 ? currentIndex - 1 : list.length - 1
        list[prev]?.focus()
      } else if (e.key === "ArrowRight") {
        const active = document.activeElement as HTMLElement
        const itemId = active?.getAttribute("data-item-id")
        const target = currentLevel.items.find((i) => i.id === itemId)
        if (target?.children) {
          e.preventDefault()
          handlePush(target)
        }
      } else if (e.key === "ArrowLeft" || e.key === "Escape") {
        if (isNested) {
          e.preventDefault()
          handlePop()
        } else if (e.key === "Escape" && onClose) {
          e.preventDefault()
          onClose()
        }
      }
    },
    [currentLevel.items, handlePop, handlePush, isNested, onClose]
  )

  const handleItemClick = (item: SlideMenuItem) => {
    if (item.children) {
      handlePush(item)
    } else {
      if (item.onClick) item.onClick()
      if (item.href) router.push(item.href)
      if (onItemSelect) onItemSelect(item)
      if (onClose) onClose()
    }
  }

  const CurrentIcon = currentLevel.icon || SlidersHorizontal

  return (
    <div
      ref={menuContainerRef}
      role="menu"
      aria-label={currentLevel.title}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-[280px] bg-[var(--s1)] border border-[var(--line)] rounded-[18px] p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] select-none text-[var(--t1)] overflow-hidden",
        className
      )}
    >
      {/* Header Row (42px tall, s2 surface, 12px radius) */}
      <div className="h-[42px] bg-[var(--s2)] rounded-[12px] px-3 flex items-center justify-between transition-all duration-140 ease-out mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {isNested ? (
            <button
              type="button"
              onClick={handlePop}
              aria-label="Go back"
              className="size-7 -ms-1 rounded-[8px] hover:bg-[var(--s3)] text-[var(--t2)] hover:text-[var(--t1)] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--gold2)]"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : (
            <CurrentIcon className="size-4 text-[var(--t2)] shrink-0" />
          )}
          <span className="font-semibold text-[13.5px] text-[var(--t1)] truncate">
            {currentLevel.title}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="size-6 rounded-[6px] hover:bg-[var(--s3)] text-[var(--t3)] hover:text-[var(--t1)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Animated Items Container (140ms CSS slide) */}
      <div
        className={cn(
          "space-y-1 transition-transform duration-140 ease-out",
          slideDirection === "forward" && "translate-x-[-8px] opacity-90",
          slideDirection === "backward" && "translate-x-[8px] opacity-90"
        )}
      >
        {currentLevel.items.map((item) => {
          const ItemIcon = item.icon
          const hasChildren = item.children && item.children.length > 0

          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-item-id={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "w-full h-[44px] min-h-[44px] rounded-[12px] px-3 flex items-center justify-between transition-colors cursor-pointer text-start",
                item.isDestructive
                  ? "text-[var(--red)] hover:bg-[var(--redbg)]"
                  : "text-[var(--t1)] hover:bg-[var(--s3)]",
                "focus-visible:outline-2 focus-visible:outline-[var(--gold2)] focus-visible:outline-offset-1"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {ItemIcon && (
                  <ItemIcon
                    className={cn(
                      "size-[16px] shrink-0",
                      item.iconColor
                        ? item.iconColor
                        : item.isDestructive
                        ? "text-[var(--red)]"
                        : "text-[var(--t2)]"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-[13px] truncate",
                    item.isDestructive ? "text-[var(--red)] font-medium" : "text-[var(--t1)] font-normal"
                  )}
                >
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums",
                      item.badgeColor === "green" &&
                        "bg-[var(--greenbg)] text-[var(--green)] border border-[rgba(61,214,140,0.25)]",
                      item.badgeColor === "neutral" && "text-[var(--t3)]",
                      !item.badgeColor && "text-[var(--t3)]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {hasChildren && <ChevronRight className="size-4 text-[var(--t3)]" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
