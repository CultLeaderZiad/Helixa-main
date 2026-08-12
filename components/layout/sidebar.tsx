"use client"

import type React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Zap, LayoutDashboard, LogOut, Settings, BarChart3,
  MessageSquare, Snowflake, Send, Linkedin, Share2, CreditCard, Mail
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import TextPressure from "@/components/ui/text-pressure"
import MaskedHeading from "@/components/ui/MaskedHeading"
import DepthText from "@/components/ui/DepthText"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"

interface SidebarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  username?: string
  profilePic?: string | null
  email?: string | null
  userRole?: string | null
  className?: string
  onLogout?: () => void
  onNavigate?: () => void
}

export function Sidebar({ className, username = "creator", profilePic, email, userRole, onLogout, onNavigate, ...props }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const NAV = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.overview },
    { href: "/dashboard/automations", icon: Zap, label: t.automations },
    { href: "/dashboard/inbox", icon: MessageSquare, label: t.inbox },
    { href: "/dashboard/ice-breakers", icon: Snowflake, label: t.iceBreakers },
    { href: "/dashboard/analytics", icon: BarChart3, label: t.analytics },
    { href: "/dashboard/agents", icon: Zap, label: t.agents },
  ]

  return (
    <aside className={cn("flex flex-col bg-[#0a0a09]", className)} {...props}>

      {/* Logo */}
      <Link href="/dashboard" className="block px-4 pt-4 pb-2">
        <div className="relative h-[44px] w-full pointer-events-auto">
          <DepthText
            text="HELIXA"
            className=""
            layers={8}
            depth={1.5}
            faceColor="#ffe14d"
            depthColor="#a18110"
            tilt={5}
            perspective={600}
            autoOrbit={false}
            fontSize="28px"
            fontWeight={900}
            shadow={false}
          />
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
                active
                  ? "text-white bg-white/[0.06]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-[#ffe14d]" : "")} strokeWidth={active ? 2.2 : 1.8} />
              <span className={active ? "font-medium" : ""}>{label}</span>
            </Link>
          )
        })}

        <div className="pt-5 pb-1 px-3">
          <div className="h-px bg-white/[0.06]" />
        </div>

        <Link
          href="/dashboard/connected-platforms"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
            pathname === "/dashboard/connected-platforms"
              ? "text-white bg-white/[0.06]"
              : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
          )}
        >
          {pathname === "/dashboard/connected-platforms" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
          <Share2 className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{t.connectedPlatforms}</span>
        </Link>

            {userRole === "admin" && (
          <>
            <div className="pt-5 pb-1 px-3">
              <div className="h-px bg-white/[0.06]" />
            </div>
            <div className="px-3 pb-1 pt-2 font-mono-ui text-[9px] uppercase tracking-widest text-neutral-600">
              {t.admin}
            </div>
            <Link
              href="/dashboard/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
                pathname === "/dashboard/admin"
                  ? "text-white bg-white/[0.06]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
              )}
            >
              {pathname === "/dashboard/admin" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
              <BarChart3 className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span>{t.usersAndStats}</span>
            </Link>
            <Link
              href="/dashboard/admin/plans"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
                pathname === "/dashboard/admin/plans"
                  ? "text-white bg-white/[0.06]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
              )}
            >
              {pathname === "/dashboard/admin/plans" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
              <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span>{t.billing}</span>
            </Link>
            <Link
              href="/dashboard/admin/agents"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
                pathname === "/dashboard/admin/agents"
                  ? "text-white bg-white/[0.06]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
              )}
            >
              {pathname === "/dashboard/admin/agents" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
              <Zap className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span>{t.agents}</span>
            </Link>
            <Link
              href="/dashboard/admin/campaigns"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
                pathname.startsWith("/dashboard/admin/campaigns")
                  ? "text-white bg-white/[0.06]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
              )}
            >
              {pathname.startsWith("/dashboard/admin/campaigns") && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
              <Mail className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span>{t.campaigns}</span>
            </Link>
          </>
        )}

        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
            pathname === "/dashboard/billing"
              ? "text-white bg-white/[0.06]"
              : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
          )}
        >
          {pathname === "/dashboard/billing" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
          <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{t.billingTitle}</span>
        </Link>

        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
            pathname === "/dashboard/settings"
              ? "text-white bg-white/[0.06]"
              : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
          )}
        >
          {pathname === "/dashboard/settings" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#ffe14d]" />}
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{t.settings}</span>
        </Link>

        <a
          href="https://t.me/cultleaderziad"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-neutral-500 hover:text-[#2AABEE] hover:bg-white/[0.03] transition-colors"
        >
          <Send className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{t.getHelp}</span>
        </a>

        <a
          href="https://www.linkedin.com/in/ziad-sabry-cl/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-neutral-500 hover:text-[#0A66C2] hover:bg-white/[0.03] transition-colors"
        >
          <Linkedin className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{t.linkedIn}</span>
        </a>

        <div className="pt-2 flex flex-col gap-1">
          <div className="px-1 flex justify-start">
            <LanguageSwitcher />
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-[13px] text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>{t.logout}</span>
          </button>
        </div>
      </nav>

      {/* Account */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/[0.06] group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-500 p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              {profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePic} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-white">{username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">@{username}</p>
            {email && (
              <p className="text-[10px] text-neutral-500 truncate">{email}</p>
            )}
        {userRole === "admin" && (
              <p className="font-mono-ui text-[8px] uppercase tracking-wider text-[#ffe14d]/80">admin</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              title="Account settings"
              className="p-1.5 rounded-md text-neutral-600 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onLogout}
              title="Log out"
              className="p-1.5 rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}