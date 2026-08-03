"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Activity, Users, MessageCircle, Zap, Loader2, AlertCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

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

interface PaymentStatus {
    hasPendingSubmission: boolean
    needsManualRenewal: boolean
    daysToRenew: number
}

export default function DashboardPage() {
    const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

    useEffect(() => {
        if (!userId) return

        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/dashboard/stats?userId=${userId}`)
                const data = await res.json()
                if (data && !data.error) {
                    setStats(data)
                }

                // Check payment submission & subscription status
                const supabase = getSupabaseBrowserClient()
                const { data: pending } = await supabase
                    .from("payment_submissions")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("status", "pending")
                    .limit(1)

                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select("payment_method, current_period_end")
                    .eq("user_id", userId)
                    .single()

                let needsManualRenewal = false
                let daysToRenew = 0

                if (sub && sub.payment_method === 'vodafone_cash' && sub.current_period_end) {
                    const diff = new Date(sub.current_period_end).getTime() - new Date().getTime()
                    daysToRenew = Math.ceil(diff / (1000 * 60 * 60 * 24))
                    if (daysToRenew <= 3 && daysToRenew > 0) {
                        needsManualRenewal = true
                    }
                }

                setPaymentStatus({
                    hasPendingSubmission: !!(pending && pending.length > 0),
                    needsManualRenewal,
                    daysToRenew
                })

            } catch (err) {
                console.error("Failed to load dashboard stats", err)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()

        // Realtime Subscription
        const supabase = getSupabaseBrowserClient()
        
        const eventsSubscription = supabase.channel('dashboard-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_events', filter: `user_id=eq.${userId}` }, (payload) => {
                setStats(prev => {
                    if (!prev) return prev
                    const newEvent = {
                        id: payload.new.id,
                        content: `Triggered automation via ${payload.new.platform || 'instagram'}`,
                        created_at: payload.new.created_at
                    }
                    return {
                        ...prev,
                        metrics: { ...prev.metrics, messagesSent: prev.metrics.messagesSent + 1 },
                        recentActivity: [newEvent, ...prev.recentActivity].slice(0, 10)
                    }
                })
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` }, (payload) => {
                setStats(prev => {
                    if (!prev) return prev
                    const newMsg = {
                        id: payload.new.id,
                        content: payload.new.message_text || "Sent media/attachment",
                        created_at: payload.new.created_at,
                        recipient: { recipient_username: payload.new.sender_id || "user" }
                    }
                    return {
                        ...prev,
                        recentActivity: [newMsg, ...prev.recentActivity].slice(0, 10)
                    }
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(eventsSubscription)
        }
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
            {/* Payment Banners */}
            {paymentStatus?.hasPendingSubmission && (
                <div className="border border-blue-500/30 bg-blue-500/10 rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                    <p className="font-mono text-sm text-blue-400">Payment pending review. Your plan will be activated once approved by an admin.</p>
                </div>
            )}
            
            {paymentStatus?.needsManualRenewal && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="font-mono text-sm text-red-400">Your Vodafone Cash subscription expires in {paymentStatus.daysToRenew} day(s). Renew soon to prevent interruption.</p>
                    </div>
                    <a href="/billing" className="font-mono text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 transition-colors">
                        Renew Now
                    </a>
                </div>
            )}

            {/* Brand Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0a] h-[420px] md:h-[460px]">
                {/* Background styling for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/5 via-transparent to-transparent opacity-50" />
                
                {/* Legibility overlay */}
                <div className="absolute inset-0 pointer-events-none" />

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
