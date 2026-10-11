"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { cn } from "@/lib/utils"

interface TopBarProps {
  workspaceName?: string
  actions?: React.ReactNode
  className?: string
}

const routeTitleMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/inbox": "Inbox",
  "/dashboard/automations": "Automations",
  "/dashboard/ai-engine": "AI Agent",
  "/dashboard/contacts": "Contacts",
  "/dashboard/broadcasts": "Broadcasts",
  "/dashboard/analytics": "Analytics",
  "/dashboard/connected-platforms": "Channels",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
  "/dashboard/updates": "Updates",
  "/dashboard/admin": "Admin",
  "/dashboard/admin/plans": "Plans",
}

export function TopBar({
  workspaceName = "Client",
  actions,
  className,
}: TopBarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [range, setRange] = React.useState("7d")

  // Match the page title
  const pageTitle =
    routeTitleMap[pathname] ||
    Object.entries(routeTitleMap).find(([path]) => path !== "/dashboard" && pathname.startsWith(path))?.[1] ||
    "Dashboard"

  return (
    <header
      className={cn(
        "h-[52px] border-b border-[var(--line)] bg-[var(--bg)] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none",
        className
      )}
    >
      {/* Breadcrumb: Client / Page */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12.5px] min-w-0">
        <span className="text-[var(--t2)] font-normal truncate max-w-[140px] sm:max-w-[200px]">
          {workspaceName}
        </span>
        <span className="text-[var(--t3)]">/</span>
        <span className="text-[var(--t1)] font-semibold truncate">
          {pageTitle}
        </span>
      </nav>

      {/* Page Actions on inline-end */}
      <div className="flex items-center gap-2.5 shrink-0">
        {actions ? (
          actions
        ) : (
          <>
            {/* Standard date range filter (only shown on overview/analytics) */}
            {(pathname === "/dashboard" || pathname === "/dashboard/analytics") && (
              <SegmentedControl
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "today", label: "Today" },
                  { value: "7d", label: "7 days" },
                  { value: "30d", label: "30 days" },
                ]}
              />
            )}

            {/* Notification bell */}
            <Link
              href="/dashboard/updates"
              aria-label="Updates and notifications"
              className="size-[26px] rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] hover:bg-[var(--s3)] text-[var(--t2)] hover:text-[var(--t1)] flex items-center justify-center transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[var(--t1)]"
            >
              <Bell className="size-3.5" />
            </Link>

            {/* New automation CTA */}
            <Button asChild size="sm" variant="primary">
              <Link href="/dashboard/automations">
                <Plus className="size-3.5" />
                <span>New automation</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
