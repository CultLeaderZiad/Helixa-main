"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"
import {
  User,
  LayoutGrid,
  SunMoon,
  Sliders,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react"

export interface AccountMenuProps {
  children: React.ReactNode
  username?: string
  email?: string | null
  plan?: string | null
  workspaceName?: string
  onLogout?: () => void
}

export function AccountMenu({
  children,
  username = "Workspace owner",
  email,
  plan = "Pro",
  workspaceName = "Workspace",
  onLogout,
}: AccountMenuProps) {
  const router = useRouter()
  const [themeName, setThemeName] = useState<"Dark" | "Light" | "System">("Dark")

  const handleToggleTheme = () => {
    setThemeName((prev) => (prev === "Dark" ? "System" : prev === "System" ? "Light" : "Dark"))
  }

  const handleSignOut = () => {
    if (onLogout) {
      onLogout()
    } else {
      window.location.href = "/api/auth/logout"
    }
  }

  const initials = username
    ? username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "WO"

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="top"
          sideOffset={8}
          className="z-50 w-[240px] bg-[#0C0C0E] border border-[var(--line)] rounded-[20px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.6)] text-[var(--t1)] select-none focus:outline-none animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-120"
        >
          {/* Header Card */}
          <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-[12px] bg-[var(--s2)]">
            <div className="size-8 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center shrink-0">
              <span className="text-[11.5px] font-semibold text-[var(--t1)] uppercase">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex flex-col text-start">
              <span className="text-[13px] font-semibold text-[var(--t1)] truncate leading-tight">
                {username}
              </span>
              <span className="text-[11px] text-[var(--t3)] truncate leading-tight">
                {plan} plan · {workspaceName}
              </span>
            </div>
          </div>

          {/* Profile */}
          <DropdownMenu.Item
            onSelect={() => router.push("/dashboard/settings/profile")}
            className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <User className="size-[17px] text-[var(--t2)]" />
              <span>Profile</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--t3)]">⇧⌘P</span>
          </DropdownMenu.Item>

          {/* Switch Workspace */}
          <DropdownMenu.Item
            onSelect={() => router.push("/dashboard/settings/workspaces")}
            className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="size-[17px] text-[var(--t2)]" />
              <span>Switch workspace</span>
            </div>
            <ChevronRight className="size-4 text-[var(--t3)]" />
          </DropdownMenu.Item>

          {/* Theme */}
          <DropdownMenu.Item
            onSelect={handleToggleTheme}
            className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <SunMoon className="size-[17px] text-[var(--t2)]" />
              <span>Theme</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--t3)]">{themeName}</span>
          </DropdownMenu.Item>

          {/* Settings */}
          <DropdownMenu.Item
            onSelect={() => router.push("/dashboard/settings")}
            className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="size-[17px] text-[var(--t2)]" />
              <span>Settings</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--t3)]">⌘,</span>
          </DropdownMenu.Item>

          {/* Help & docs */}
          <DropdownMenu.Item
            onSelect={() => router.push("/faq")}
            className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="size-[17px] text-[var(--t2)]" />
              <span>Help & docs</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--t3)]">?</span>
          </DropdownMenu.Item>

          {/* 1px Separator */}
          <DropdownMenu.Separator className="h-[1px] bg-[var(--line)] my-1.5" />

          {/* Sign out */}
          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="h-[40px] rounded-[12px] px-3 flex items-center gap-2.5 text-[13px] text-[var(--red)] hover:bg-[var(--redbg)] focus:bg-[var(--redbg)] focus:outline-none cursor-pointer transition-colors"
          >
            <LogOut className="size-[17px] text-[var(--red)]" />
            <span className="font-medium">Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
