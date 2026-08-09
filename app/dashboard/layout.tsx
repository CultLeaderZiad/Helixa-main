"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import Image from "next/image"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Loader2 } from "lucide-react"
import { TrialBanner } from "@/components/layout/TrialBanner"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { username, profilePic, logout, plan, trialEndsAt, trialExempt, isLoading, accountId, email, role, hasValidPayment, isTrialExpired, isPastDeadline } = useInstagramSession()

    const router = useRouter()

    // Redirect to /login once we know the session is fully loaded and there is
    // no authenticated account. Doing this in an effect (instead of during
    // render) avoids "Cannot update a component while rendering another".
    useEffect(() => {
        if (!isLoading) {
            if (!accountId) {
                router.replace('/login')
                return
            }
            if (role === 'admin' || email === 'cultleaderzoz.dev@gmail.com') {
                return
            }
            if (!trialExempt && plan === 'trial' && isTrialExpired && isPastDeadline) {
                router.replace('/pricing')
                return
            }
            if (plan && plan !== 'trial' && !hasValidPayment && isPastDeadline) {
                router.replace('/pricing')
                return
            }
        }
    }, [isLoading, accountId, plan, trialExempt, isTrialExpired, isPastDeadline, hasValidPayment, role, email, router])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#03010A] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }

    if (!accountId) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#03010A] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-transparent text-foreground">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
                <Sidebar
                    className="h-full border-r border-white/10 bg-[#03010A]/50 backdrop-blur-xl"
                    username={username || "User"}
                    profilePic={profilePic}
                    email={email}
                    userRole={role}
                    onLogout={logout}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                {/* Mobile Header (Visible only on small screens) */}
                <header className="md:hidden h-16 border-b border-white/10 bg-[#03010A] flex items-center justify-between px-4 sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold italic tracking-wider text-white">HELIXA</span>
                    </div>
                    <MobileNav username={username || "User"} profilePic={profilePic} email={email} userRole={role} onLogout={logout} />
                </header>

                <main className="flex-1 relative overflow-auto">
                    {!trialExempt && <TrialBanner plan={plan || ""} trialEndsAt={trialEndsAt} />}
                    {children}
                </main>
            </div>
        </div>
    )
}
