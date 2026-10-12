"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { TopBar } from "@/components/layout/TopBar"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Loader2 } from "lucide-react"
import { TrialBanner } from "@/components/layout/TrialBanner"
import { UsageNotice } from "@/components/layout/UsageNotice"
import { CommandPalette } from "@/components/ui/CommandPalette"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const {
        username,
        profilePic,
        logout,
        plan,
        trialEndsAt,
        trialExempt,
        isLoading,
        accountId,
        email,
        role,
        hasValidPayment,
        isTrialExpired,
        isPastDeadline,
        isBanned,
        bannedReason,
        instagramReconnectRequired
    } = useInstagramSession()

    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isLoading) {
            if (!accountId) {
                router.replace('/login')
                return
            }
            if (role === 'admin') {
                return
            }
            if (!trialExempt && plan === 'trial' && isTrialExpired && isPastDeadline) {
                router.replace('/dashboard/billing')
                return
            }
            if (plan && plan !== 'trial' && !hasValidPayment && isPastDeadline) {
                router.replace('/dashboard/billing')
                return
            }
        }
    }, [isLoading, accountId, plan, trialExempt, isTrialExpired, isPastDeadline, hasValidPayment, role, router])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--t1)]">
                <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
            </div>
        )
    }

    if (!accountId) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--t1)]">
                <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
            </div>
        )
    }

    if (isBanned) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--t1)] p-4">
                <div className="max-w-md w-full border border-[rgba(242,85,90,0.25)] bg-[var(--s1)] rounded-[12px] p-6 text-center space-y-4">
                    <div className="size-12 bg-[var(--redbg)] border border-[rgba(242,85,90,0.25)] rounded-full flex items-center justify-center mx-auto text-[var(--red)]">
                        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-[18px] font-semibold text-[var(--t1)]">Access suspended</h2>
                        <p className="text-[13px] text-[var(--t2)]">
                            Your account has been administrative banned.
                        </p>
                    </div>

                    {bannedReason && (
                        <div className="bg-[var(--s2)] border border-[var(--line2)] rounded-[8px] p-3 text-start">
                            <span className="text-[11px] font-mono text-[var(--red)] block mb-1">Reason:</span>
                            <p className="text-[12px] text-[var(--t2)] font-mono">{bannedReason}</p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={logout}
                            className="w-full bg-[var(--redbg)] border border-[rgba(242,85,90,0.25)] hover:bg-red-500/20 text-[var(--red)] text-[12.5px] font-medium py-2 rounded-[6px] transition-colors cursor-pointer"
                        >
                            Log out of account
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-[var(--bg)] text-[var(--t1)]">
            {/* ⌘K Command Palette (global) */}
            <CommandPalette />

            {/* Desktop Sidebar (240px fixed) */}
            <div className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 md:start-0 z-40">
                <Sidebar
                    className="h-full"
                    username={username || "Creator"}
                    profilePic={profilePic}
                    email={email}
                    userRole={role}
                    plan={plan}
                    onLogout={logout}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:ps-[240px] min-w-0">
                {/* Mobile Header (rendered on all pages except inbox which provides its own dedicated 56px sticky header) */}
                {!pathname?.startsWith('/dashboard/inbox') && (
                    <header className="md:hidden h-[52px] border-b border-[var(--line)] bg-[var(--s1)] flex items-center justify-between px-4 sticky top-0 z-30">
                        <div className="flex items-center gap-2.5">
                            <MobileNav username={username || "Creator"} profilePic={profilePic} email={email} userRole={role} onLogout={logout} />
                            <span className="font-semibold text-[14px] text-[var(--t1)]">Helixa</span>
                        </div>
                    </header>
                )}

                {/* 52px Desktop Top Bar */}
                <div className="hidden md:block">
                    <TopBar workspaceName={username || "Workspace"} />
                </div>

                <main
                    id="main-content"
                    className={`flex-1 relative z-10 ${
                        pathname?.startsWith('/dashboard/inbox') ? 'overflow-hidden' : 'overflow-auto'
                    }`}
                >
                    {!trialExempt && <TrialBanner plan={plan || ""} trialEndsAt={trialEndsAt} />}
                    <UsageNotice />
                    {instagramReconnectRequired && (
                        <div className="mx-4 mt-4 md:mx-6 rounded-[8px] border border-[rgba(245,165,36,0.30)] bg-[var(--amberbg)] px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[12.5px] text-[var(--amber)]">
                                Instagram needs to be reconnected. Automations stay paused until Meta accepts a new login.
                            </p>
                            <a
                                href="/api/instagram/auth"
                                className="shrink-0 rounded-[6px] bg-[var(--amber)] px-3 py-1.5 text-[11.5px] font-semibold text-black hover:opacity-90 transition-opacity"
                            >
                                Reconnect Instagram
                            </a>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    )
}
