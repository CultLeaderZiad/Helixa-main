"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Activity, Users, MessageCircle, Zap, Loader2, AlertCircle, Sparkles, RefreshCcw, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
import TextPressure from "@/components/ui/text-pressure"
import SplitText from "@/components/ui/SplitText"
import { useLanguage } from "@/lib/i18n/LanguageContext"

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
    const { t } = useLanguage()
    
    const [themes, setThemes] = useState<any[]>([])
    const [loadingThemes, setLoadingThemes] = useState(false)

    const fetchThemes = async (force = false) => {
        if (!userId) return
        setLoadingThemes(true)
        try {
            const res = await fetch(`/api/ai/analyze-comment-themes${force ? "?force=true" : ""}`, { method: "POST" })
            const data = await res.json()
            if (data.themes) setThemes(data.themes)
        } catch (e) {
            console.error("Failed to fetch themes", e)
        }
        setLoadingThemes(false)
    }

    useEffect(() => {
        if (!userId) {
            setLoading(false)
            return
        }
        fetchThemes()

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

    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#03010A] p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to view your dashboard and metrics." />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Payment Banners */}
            {paymentStatus?.hasPendingSubmission && (
                <div className="border border-blue-500/30 bg-blue-500/10 rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                    <p className="font-mono text-sm text-blue-400">{t.paymentPendingReview}</p>
                </div>
            )}
            
            {paymentStatus?.needsManualRenewal && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="font-mono text-sm text-red-400">{t.vodafoneExpires.replace('{{days}}', String(paymentStatus.daysToRenew))}</p>
                    </div>
                    <a href="/billing" className="font-mono text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 transition-colors">
                        {t.renewNow}
                    </a>
                </div>
            )}

            {/* Greeting */}
            <div className="mb-10 mt-4 relative">
                {/* Top-right HELIXA logo */}
                <div className="absolute top-0 right-0 h-[36px] w-[100px] pointer-events-auto hidden md:block">
                    <TextPressure
                        text="HELIXA"
                        flex={true}
                        alpha={false}
                        stroke={false}
                        width={true}
                        weight={true}
                        italic={false}
                        textColor="#ffe14d"
                        minFontSize={10}
                    />
                </div>

                {/* Logo above Overview label */}
                <div className="h-[36px] w-[80px] pointer-events-auto mb-3">
                    <TextPressure
                        text="HELIXA"
                        flex={true}
                        alpha={false}
                        stroke={false}
                        width={true}
                        weight={true}
                        italic={false}
                        textColor="#ffe14d"
                        minFontSize={10}
                    />
                </div>

                <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-[#ffe14d] mb-3 font-bold">{t.overviewLabel}</p>
                <SplitText
                    text={`Hey, ${username || "creator"}.`}
                    className="font-serif-display text-4xl md:text-5xl text-white leading-none mb-4"
                    delay={30}
                    duration={0.8}
                    ease="power3.out"
                    splitType="words, chars"
                    from={{ opacity: 0, y: 20 }}
                    to={{ opacity: 1, y: 0 }}
                    tag="h1"
                    textAlign="left"
                />
                <p className="text-neutral-400 text-sm">{t.overviewSubtitle}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={t.totalAutomations}
                    value={stats?.metrics.totalAutomations.toString() || "0"}
                    trend={t.activeLabel}
                    icon={<Zap className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title={t.messagesSent}
                    value={stats?.metrics.messagesSent.toString() || "0"}
                    trend={t.lifetime}
                    icon={<MessageCircle className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title={t.activeTriggers}
                    value={stats?.metrics.activeTriggers.toString() || "0"}
                    trend={t.running}
                    icon={<Activity className="w-5 h-5 text-[#ffe14d]" />}
                />
                <StatCard
                    title={t.audienceReached}
                    value={stats?.metrics.audienceReached.toString() || "0"}
                    trend={t.uniqueUsers}
                    icon={<Users className="w-5 h-5 text-[#ffe14d]" />}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 bg-[#0b0b0a] border-white/10">
                    <h3 className="font-serif-display text-2xl text-white mb-5">{t.recentActivity}</h3>
                    <div className="space-y-4">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((msg) => (
                                <div key={msg.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-[#ffe14d]/10 flex items-center justify-center text-[#ffe14d] shrink-0">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {t.autoReplyTo.replace('{{user}}', msg.recipient?.recipient_username || "user")}
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
                                {t.noRecentActivity}
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6 bg-[#0b0b0a] border-white/10">
                    <h3 className="font-serif-display text-2xl text-white mb-5">{t.quickActions}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/dashboard/automations" className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Zap className="w-6 h-6 text-muted-foreground group-hover:text-[#ffe14d] mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">{t.newRule}</span>
                        </Link>
                        <div className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Users className="w-6 h-6 text-muted-foreground group-hover:text-[#ffe14d] mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">{t.viewAudience}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Comment Themes Card */}
            <Card className="p-6 bg-[#0b0b0a] border-white/10 mt-8">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-serif-display text-2xl text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#ffe14d]" />
                            {t.whatPeopleAsk}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">{t.aiAnalysisDesc}</p>
                    </div>
                    <button 
                        onClick={() => fetchThemes(true)} 
                        disabled={loadingThemes}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 transition-colors disabled:opacity-50"
                        title="Force refresh (uses AI credits)"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loadingThemes ? "animate-spin" : ""}`} />
                    </button>
                </div>
                
                {loadingThemes && themes.length === 0 ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                ) : themes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {themes.map((theme: any) => (
                            <div key={theme.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="text-sm font-bold text-white capitalize">{theme.theme}</h4>
                                        <span className="text-[10px] font-mono-ui bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">{theme.count}x</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mb-3 line-clamp-2">"{theme.examples}"</p>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {theme.keywords?.split(",").map((k: string, i: number) => (
                                            <span key={i} className="text-[9px] uppercase tracking-wider bg-[#ffe14d]/10 text-[#ffe14d] px-1.5 py-0.5 rounded">
                                                {k.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <Link 
                                    href={`/dashboard/automations?intent=${encodeURIComponent("Reply to comments about " + theme.theme + " matching keywords: " + theme.keywords)}`}
                                    className="text-xs font-bold text-black bg-[#ffe14d] hover:bg-[#ffe14d]/90 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                >
                                    {t.turnIntoAutomation} <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-neutral-500 text-sm">
                        {t.notEnoughComments}
                    </div>
                )}
            </Card>
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
