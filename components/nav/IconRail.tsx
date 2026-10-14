"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as Tooltip from "@radix-ui/react-tooltip"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"
import { NAV, type NavItem, filterNavByRole } from "@/lib/nav/config"
import { BrandLogo } from "@/components/ui/BrandLogo"
import { AccountMenu } from "./AccountMenu"

export interface IconRailProps {
  className?: string
  username?: string
  email?: string | null
  userRole?: string | null
  plan?: string | null
  onLogout?: () => void
}

export function IconRail({
  className,
  username = "Workspace owner",
  email,
  userRole,
  plan,
  onLogout,
}: IconRailProps) {
  const pathname = usePathname()
  const items = filterNavByRole(NAV, userRole)

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        className={cn(
          "w-[64px] min-w-[64px] max-w-[64px] h-full bg-[var(--s1)] border-e border-[var(--line)] flex flex-col items-center justify-between py-3.5 select-none text-[var(--t1)]",
          className
        )}
      >
        {/* Top: Logo */}
        <div className="flex flex-col items-center space-y-4 shrink-0">
          <Link
            href="/dashboard"
            aria-label="CYREAX DM Overview"
            className="size-10 rounded-[10px] flex items-center justify-center hover:bg-[var(--s2)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--gold2)]"
          >
            <BrandLogo variant="mark" size="sm" />
          </Link>

          {/* Navigation Icon Buttons */}
          <nav aria-label="Main navigation rail" className="flex flex-col items-center space-y-1.5">
            {items.map((item) => {
              const hasChildren = item.children && item.children.length > 0
              const Icon = item.icon
              if (!Icon) return null

              const isDirectActive = item.href ? pathname === item.href : false
              const isChildActive = hasChildren
                ? item.children!.some(
                    (child) =>
                      child.href &&
                      (pathname === child.href || pathname.startsWith(child.href + "/"))
                  )
                : false
              const isActive = isDirectActive || isChildActive

              if (hasChildren) {
                return (
                  <DropdownMenu.Root key={item.id}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            aria-label={item.label}
                            className={cn(
                              "relative size-[44px] rounded-[10px] flex items-center justify-center transition-colors cursor-pointer",
                              isActive
                                ? "bg-[var(--s3)] text-[var(--t1)]"
                                : "text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)]",
                              "focus-visible:outline-2 focus-visible:outline-[var(--gold2)] focus-visible:outline-offset-1"
                            )}
                          >
                            {/* Gold Bar at left/start edge */}
                            {isActive && (
                              <div
                                className="absolute start-0 top-[12px] w-[2px] h-[20px] bg-[var(--gold)] rounded-e-full"
                                aria-hidden="true"
                              />
                            )}
                            <Icon className="size-5 shrink-0" />
                          </button>
                        </DropdownMenu.Trigger>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="right"
                          sideOffset={10}
                          className="z-50 px-2.5 py-1 rounded-[6px] bg-[#0C0C0E] border border-[var(--line)] text-[12px] font-medium text-[var(--t1)] shadow-lg animate-in fade-in-0 zoom-in-95"
                        >
                          {item.label}
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>

                    {/* Flyout Popover for Children */}
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        side="right"
                        sideOffset={10}
                        align="start"
                        className="z-50 w-[200px] bg-[#0C0C0E] border border-[var(--line)] rounded-[20px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.6)] text-[var(--t1)] select-none focus:outline-none animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-120"
                      >
                        <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
                          {item.label}
                        </div>
                        <div className="space-y-0.5">
                          {item.children!.map((child) => {
                            const isChildRowActive =
                              child.href &&
                              (pathname === child.href || pathname.startsWith(child.href + "/"))

                            return (
                              <DropdownMenu.Item key={child.id} asChild>
                                <Link
                                  href={child.href || "#"}
                                  className={cn(
                                    "relative h-[36px] rounded-[10px] px-3 flex items-center text-[12.5px] transition-colors cursor-pointer",
                                    isChildRowActive
                                      ? "text-[var(--gold)] font-semibold bg-[var(--s3)]"
                                      : "text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--s2)]",
                                    "focus:outline-none focus:bg-[var(--s3)]"
                                  )}
                                >
                                  {/* Gold bar on active child */}
                                  {isChildRowActive && (
                                    <div
                                      className="absolute start-1 top-[8px] w-[2px] h-[20px] bg-[var(--gold)] rounded-full"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className={cn(isChildRowActive && "ps-2")}>
                                    {child.label}
                                  </span>
                                </Link>
                              </DropdownMenu.Item>
                            )
                          })}
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                )
              }

              return (
                <Tooltip.Root key={item.id}>
                  <Tooltip.Trigger asChild>
                    <Link
                      href={item.href || "#"}
                      aria-label={item.label}
                      className={cn(
                        "relative size-[44px] rounded-[10px] flex items-center justify-center transition-colors cursor-pointer",
                        isActive
                          ? "bg-[var(--s3)] text-[var(--t1)]"
                          : "text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--gold2)] focus-visible:outline-offset-1"
                      )}
                    >
                      {isActive && (
                        <div
                          className="absolute start-0 top-[12px] w-[2px] h-[20px] bg-[var(--gold)] rounded-e-full"
                          aria-hidden="true"
                        />
                      )}
                      <Icon className="size-5 shrink-0" />
                    </Link>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      className="z-50 px-2.5 py-1 rounded-[6px] bg-[#0C0C0E] border border-[var(--line)] text-[12px] font-medium text-[var(--t1)] shadow-lg animate-in fade-in-0 zoom-in-95"
                    >
                      {item.label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )
            })}
          </nav>
        </div>

        {/* Bottom: User Avatar with AccountMenu */}
        <div className="shrink-0 pt-2">
          <AccountMenu
            username={username}
            email={email}
            plan={plan}
            onLogout={onLogout}
          >
            <button
              type="button"
              aria-label="User account options"
              className="size-10 rounded-full bg-[var(--s3)] border border-[var(--line2)] hover:border-[var(--line3)] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--gold2)]"
            >
              <span className="text-[12px] font-semibold text-[var(--t1)] uppercase">
                {username ? username.slice(0, 2) : "WO"}
              </span>
            </button>
          </AccountMenu>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
