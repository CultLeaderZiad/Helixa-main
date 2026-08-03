"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import Ferrofluid from "@/components/ui/ferrofluid"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Activity, Users, MessageCircle, Zap, Loader2 } from "lucide-react"

interface DashboardStats {
    metrics: {
        totalAutomations: number
        activeTriggers: number
        audienceReached: number
        messagesSent: number
    }
    recentActivity: Array<{
        id: string
        content: string
        created_at: string
        recipient?: {
            recipient_username: string
        }
    }>
}

export default function DashboardPage() {
    const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) return

        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/dashboard/stats?userId=${userId}`)
                const data = await res.json()
                if (data && !data.error) {
                    setStats(data)
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [userId])

    if (isSessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Brand Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03010A] h-[420px] md:h-[460px]">
                <div className="absolute inset-0">
                    <Ferrofluid
                        colors={["#ffffff", "#ffffff", "#ffffff"]}
                        speed={0.5}
                        scale={1}
                        turbulence={1}
                        fluidity={0.1}
                        rimWidth={0.2}
                        sharpness={3}
                        shimmer={1}
                        glow={2}
                        flowDirection="down"
                        opacity={0.95}
                        mouseInteraction
                        mouseStrength={1}
                        mouseRadius={0.3}
                    />
                </div>

                {/* Legibility overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#03010A] via-[#03010A]/40 to-[#03010A]/15 pointer-events-none" />

                <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 pointer-events-none">
                    {/* Brand */}
                    <div className="pointer-events-auto">
                        <Image
                            src="/HELIXA-png.png"
                            alt="Helixa"
                            width={2816}
                            height={1536}
                            className="h-9 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                            priority
                        />
                    </div>

                    {/* Greeting */}
                    <div>
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-neutral-300 mb-2">Overview</p>
                        <h1 className="font-serif-display text-4xl md:text-6xl text-white leading-none">Hey, {username}.</h1>
                        <p className="text-neutral-300 text-sm mt-3">Here's what your automations did while you were away.</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Automations"
                    value={stats?.metrics.totalAutomations.toString() || "0"}
                    trend="Active"
                    icon={<Zap className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title="Messages Sent"
                    value={stats?.metrics.messagesSent.toString() || "0"}
                    trend="Lifetime"
                    icon={<MessageCircle className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title="Active Triggers"
                    value={stats?.metrics.activeTriggers.toString() || "0"}
                    trend="Running"
                    icon={<Activity className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title="Audience Reached"
                    value={stats?.metrics.audienceReached.toString() || "0"}
                    trend="Unique Users"
                    icon={<Users className="w-5 h-5 text-[#ffe14d]" />}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 bg-[#0b0b0a] border-white/10">
                    <h3 className="font-serif-display text-2xl text-white mb-5">Recent activity</h3>
                    <div className="space-y-4">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((msg) => (
                                <div key={msg.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-[#ffe14d]/10 flex items-center justify-center text-[#ffe14d] shrink-0">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            Auto-reply to @{msg.recipient?.recipient_username || "user"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate w-full max-w-[300px]">{msg.content}</p>
                                    </div>
                                    <div className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                No recent activity found.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6 bg-[#0b0b0a] border-white/10">
                    <h3 className="font-serif-display text-2xl text-white mb-5">Quick actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Zap className="w-6 h-6 text-muted-foreground group-hover:text-[#ffe14d] mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">New Rule</span>
                        </div>
                        <div className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Users className="w-6 h-6 text-muted-foreground group-hover:text-[#ffe14d] mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">View Audience</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon: React.ReactNode }) {
    return (
        <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors group">
            <div className="flex items-start justify-between">
                {icon}
                <span className="font-mono-ui text-[10px] uppercase tracking-widest text-neutral-600">{trend}</span>
            </div>
            <div className="mt-6">
                <p className="font-serif-display text-5xl text-white leading-none">{value}</p>
                <p className="font-mono-ui text-[10px] text-neutral-500 uppercase tracking-[0.2em] mt-3">{title}</p>
            </div>
        </div>
    )
}
