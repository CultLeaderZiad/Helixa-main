"use client"

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
    const { username, profilePic, logout, plan, trialEndsAt, isLoading, accountId, email, role } = useInstagramSession()

    const router = require("next/navigation").useRouter()

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#03010A] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }

    if (!accountId) {
        if (typeof window !== 'undefined') {
            router.push('/login')
        }
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
                    <Image
                        src="/HELIXA-png.png"
                        alt="Helixa"
                        width={2816}
                        height={1536}
                        className="h-7 w-auto"
                    />
                    <MobileNav username={username || "User"} profilePic={profilePic} email={email} userRole={role} onLogout={logout} />
                </header>

                <main className="flex-1 relative overflow-auto">
                    <TrialBanner plan={plan || ""} trialEndsAt={trialEndsAt} />
                    {children}
                </main>
            </div>
        </div>
    )
}
