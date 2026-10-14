"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Zap, Sparkles, Users, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR from "swr"

interface MobileTabBarProps {
  onOpenDrawer: () => void
  unreadCount?: number
  className?: string
}

export function MobileTabBar({
  onOpenDrawer,
  unreadCount: overrideUnread,
  className,
}: MobileTabBarProps) {
  const pathname = usePathname()

  // Real unread count fetch
  const { data: inboxData } = useSWR<{ unreadCount?: number }>(
    overrideUnread === undefined ? "/api/inbox/conversations?limit=1" : null,
    (url) => fetch(url).then((r) => (r.ok ? r.json() : {})),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const unreadCount = overrideUnread !== undefined ? overrideUnread : (inboxData?.unreadCount ?? 0)

  const TABS = [
    {
      id: "inbox",
      label: "Inbox",
      href: "/dashboard/inbox",
      icon: MessageSquare,
      badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
    },
    {
      id: "automations",
      label: "Automations",
      href: "/dashboard/automations",
      icon: Zap,
    },
    {
      id: "ai",
      label: "AI",
      href: "/dashboard/ai-engine",
      icon: Sparkles,
      isAi: true,
    },
    {
      id: "contacts",
      label: "Contacts",
      href: "/dashboard/contacts",
      icon: Users,
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 bg-[var(--s1)]/95 backdrop-blur-md border-t border-[var(--line)] select-none md:hidden",
        className
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="h-[49px] flex items-center justify-around px-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href))
          const Icon = tab.icon

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex-1 min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer",
                isActive ? "text-[var(--t1)]" : "text-[var(--t3)] hover:text-[var(--t2)]"
              )}
            >
              {/* 20x2px Gold Indicator Bar on Top of Active Tab */}
              {isActive && (
                <span
                  className="absolute top-0 w-5 h-[2px] bg-[var(--gold)] rounded-full"
                  aria-hidden="true"
                />
              )}

              <div className="relative">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? tab.isAi
                        ? "text-[var(--gold)]"
                        : "text-[var(--t1)]"
                      : "text-[var(--t3)] group-hover:text-[var(--t2)]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -end-2.5 px-1 py-0.2 min-w-[14px] h-[14px] rounded-full bg-[var(--blue)] text-[9px] font-mono font-bold text-black flex items-center justify-center leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* 5th Tab: "More" opens the MobileDrawer */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open menu drawer"
          className="relative flex-1 min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-[var(--t3)] hover:text-[var(--t2)] transition-colors group cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4 text-[var(--t3)] group-hover:text-[var(--t2)]" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  )
}
