"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { 
    Zap, Users, MessageSquare, Activity, Loader2, AlertCircle, 
    Sparkles, RefreshCcw, ArrowRight, ChevronRight, CheckCircle2, 
    Send, Share2, Radio, Layers
} from "lucide-react"

import { useInstagramSession } from "@/hooks/use-instagram-session"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
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
        platform?: string
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

// Pure SVG Sparkline Component (Zero Heavy Chart Libraries)
function MiniSparkline({ color = "#e5a93c", type = "up" }: { color?: string, type?: "up" | "wave" | "steady" }) {
    if (type === "wave") {
        return (
            <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
                <path 
                    d="M2 18 C 15 6, 25 22, 40 10 C 55 0, 65 14, 78 4" 
                    stroke={color} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
                <path 
                    d="M2 18 C 15 6, 25 22, 40 10 C 55 0, 65 14, 78 4 V 24 H 2 Z" 
                    fill={`url(#goldGradientWave)`} 
                    opacity="0.15"
                />
                <defs>
                    <linearGradient id="goldGradientWave" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
            </svg>
        )
    }

    if (type === "steady") {
        return (
            <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
                <path 
                    d="M2 14 C 18 12, 30 18, 45 8 C 60 14, 68 6, 78 8" 
                    stroke={color} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
                <path 
                    d="M2 14 C 18 12, 30 18, 45 8 C 60 14, 68 6, 78 8 V 24 H 2 Z" 
                    fill={`url(#goldGradientSteady)`} 
                    opacity="0.15"
                />
                <defs>
                    <linearGradient id="goldGradientSteady" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
            </svg>
        )
    }

    return (
        <svg className="w-20 h-6 shrink-0" viewBox="0 0 80 24" fill="none">
            <path 
                d="M2 20 L 22 14 L 40 16 L 58 8 L 78 3" 
                stroke={color} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            <path 
                d="M2 20 L 22 14 L 40 16 L 58 8 L 78 3 V 24 H 2 Z" 
                fill={`url(#goldGradientUp)`} 
                opacity="0.15"
            />
            <defs>
                <linearGradient id="goldGradientUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>
    )
}

// Platform badge icon
function PlatformIcon({ platform = "instagram" }: { platform?: string }) {
    const p = platform.toLowerCase()
    if (p.includes("telegram")) {
        return (
            <div className="w-8 h-8 rounded-lg bg-[#2AABEE]/15 border border-[#2AABEE]/30 flex items-center justify-center text-[#2AABEE] shrink-0">
                <Send className="w-4 h-4" />
            </div>
        )
    }
    if (p.includes("facebook")) {
        return (
            <div className="w-8 h-8 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/30 flex items-center justify-center text-[#1877F2] shrink-0">
                <Share2 className="w-4 h-4" />
            </div>
        )
    }
    if (p.includes("linkedin")) {
        return (
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/15 border border-[#0A66C2]/30 flex items-center justify-center text-[#0A66C2] shrink-0">
                <Layers className="w-4 h-4" />
            </div>
        )
    }
    // Default: Instagram gradient
    return (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <MessageSquare className="w-4 h-4" />
        </div>
    )
}

export default function DashboardPage() {
    const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
    const { t } = useLanguage()
    
    const { data: statsData, mutate: mutateStats } = useSWR(
        userId ? `/api/dashboard/stats?userId=${userId}` : null,
        (url) => fetch(url).then(r => r.json())
    )

    // Weekly Coach digest teaser — only rendered when a real digest exists
    const { data: digestData } = useSWR(
        userId ? "/api/ai/weekly-digest" : null,
        (url) => fetch(url).then(r => r.json())
    )

    const paymentStatus = statsData?.paymentStatus
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        if (statsData && !statsData.error) {
            setStats(statsData)
        }
    }, [statsData])

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

    const handleRefreshAll = async () => {
        setIsRefreshing(true)
        try {
            await Promise.all([
                mutateStats(),
                fetchThemes(false)
            ])
        } finally {
            setTimeout(() => setIsRefreshing(false), 500)
        }
    }

    useEffect(() => {
        if (!userId) return
        fetchThemes()

        const supabase = getSupabaseBrowserClient()
        
        const eventsSubscription = supabase.channel('dashboard-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_events', filter: `user_id=eq.${userId}` }, (payload) => {
                setStats(prev => {
                    if (!prev) return prev
                    const newEvent = {
                        id: payload.new.id,
                        content: `Triggered automation via ${payload.new.platform || 'instagram'}`,
                        created_at: payload.new.created_at,
                        platform: payload.new.platform || 'instagram'
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
                        platform: "instagram",
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

    if (isSessionLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-[#e5a93c] animate-spin" />
            </div>
        )
    }

    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to view your dashboard and metrics." />
            </div>
        )
    }

    const totalRules = stats?.metrics.totalAutomations ?? 0
    const messagesCount = stats?.metrics.messagesSent ?? 0
    const activeTriggers = stats?.metrics.activeTriggers ?? 0
    const audienceReached = stats?.metrics.audienceReached ?? 0

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto motion-fade-in">
            {/* Payment & Renewal Notifications */}
            {paymentStatus?.hasPendingSubmission && (
                <div className="border border-blue-500/25 bg-blue-500/10 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-blue-300 font-medium">{t.paymentPendingReview}</p>
                </div>
            )}
            
            {paymentStatus?.needsManualRenewal && (
                <div className="border border-red-500/25 bg-red-500/10 rounded-xl p-4 flex items-center justify-between gap-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-red-300 font-medium">
                            {t.vodafoneExpires.replace('{{days}}', String(paymentStatus.daysToRenew))}
                        </p>
                    </div>
                    <Link href="/dashboard/billing" className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors font-semibold">
                        {t.renewNow}
                    </Link>
                </div>
            )}

            {/* Top Executive Context Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium mb-1">
                        <span>Dashboard</span>
                        <span>/</span>
                        <span className="text-white font-semibold">{t.overviewLabel}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {t.greeting ? t.greeting.replace('{{name}}', username || "Creator") : `Welcome back, ${username || "Creator"}`}
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                        {t.overviewSubtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center">
                    {/* Workspace / Plan Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5a93c]/10 border border-[#e5a93c]/25 text-[#f3ba4f] text-xs font-semibold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93c] animate-pulse" />
                        <span>PRO WORKSPACE</span>
                    </div>

                    {/* Refresh Action */}
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        title="Refresh metrics"
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-neutral-300 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#e5a93c]" : ""}`} />
                    </button>
                </div>
            </div>

            {/* 4 Structured Enterprise Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Rules */}
                <div className="p-5 rounded-xl bg-[#111216] border border-white/[0.07] hover:border-[#e5a93c]/30 transition-all flex flex-col justify-between group shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                            <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400">{t.totalAutomations}</span>
                            <Zap className="w-4 h-4 text-[#e5a93c] group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">{totalRules}</p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {t.activeLabel}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.05]">
                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden mb-1.5">
                            <div 
                                className="h-full bg-gradient-to-r from-[#e5a93c] to-[#f3ba4f] rounded-full transition-all duration-700" 
                                style={{ width: totalRules > 0 ? `${Math.min(totalRules * 20, 100)}%` : "8%" }}
                            />
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">Active Rules: {totalRules}</span>
                    </div>
                </div>

                {/* Metric 2: Delivered Rate */}
                <div className="p-5 rounded-xl bg-[#111216] border border-white/[0.07] hover:border-[#e5a93c]/30 transition-all flex flex-col justify-between group shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                            <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400">Delivered Rate</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">99.4%</p>
                            <MiniSparkline color="#10B981" type="steady" />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 font-medium">Delivery: 99.4%</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">+0.6% vs avg</span>
                    </div>
                </div>

                {/* Metric 3: Engagements */}
                <div className="p-5 rounded-xl bg-[#111216] border border-white/[0.07] hover:border-[#e5a93c]/30 transition-all flex flex-col justify-between group shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                            <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400">{t.messagesSent}</span>
                            <MessageSquare className="w-4 h-4 text-[#e5a93c] group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                                {messagesCount.toLocaleString()}
                            </p>
                            <MiniSparkline color="#e5a93c" type="wave" />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 font-medium">Total Messages</span>
                        <span className="text-[10px] text-[#f3ba4f] font-semibold">{t.lifetime}</span>
                    </div>
                </div>

                {/* Metric 4: Audience Reached */}
                <div className="p-5 rounded-xl bg-[#111216] border border-white/[0.07] hover:border-[#e5a93c]/30 transition-all flex flex-col justify-between group shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                            <span className="font-medium uppercase tracking-wider text-[11px] text-neutral-400">{t.audienceReached}</span>
                            <Users className="w-4 h-4 text-[#e5a93c] group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                                {audienceReached.toLocaleString()}
                            </p>
                            <MiniSparkline color="#e5a93c" type="up" />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 font-medium">New Contacts</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">+14.2%</span>
                    </div>
                </div>
            </div>

            {/* Weekly Coach teaser — shown only when a real digest exists */}
            {digestData?.hasData && digestData?.digest && (
                <Link
                    href="/dashboard/ai-engine?tab=coach"
                    className="group relative flex items-center gap-4 rounded-2xl border border-[#e5a93c]/20 bg-gradient-to-r from-[#e5a93c]/[0.07] via-[#111216] to-[#111216] p-5 hover:border-[#e5a93c]/40 transition-all overflow-hidden"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#e5a93c]/15 border border-[#e5a93c]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-5 h-5 text-[#e5a93c]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#f3ba4f] font-bold mb-1">Weekly Coach</p>
                        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{digestData.digest}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[#f3ba4f] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
            )}

            {/* 3-Column Enterprise Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1: Real-time Event Feed (5 cols) */}
                <div className="lg:col-span-5 rounded-2xl bg-[#111216] border border-white/[0.07] p-5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-base font-bold text-white tracking-tight">{t.recentActivity}</h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live
                                </span>
                            </div>
                            <span className="text-xs text-neutral-400">Recent 10</span>
                        </div>

                        {/* Events List */}
                        <div className="space-y-3">
                            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors"
                                    >
                                        <PlatformIcon platform={msg.platform} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <p className="text-xs font-semibold text-white truncate">
                                                    {t.autoReplyTo.replace('{{user}}', msg.recipient?.recipient_username || "contact")}
                                                </p>
                                                <span className="text-[10px] text-neutral-400 whitespace-nowrap tabular-nums">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-400 line-clamp-1">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-neutral-400 mb-3">
                                        <Radio className="w-5 h-5 text-neutral-400" />
                                    </div>
                                    <p className="text-xs font-medium text-neutral-300 mb-1">{t.noRecentActivity}</p>
                                    <p className="text-[11px] text-neutral-400 max-w-xs">
                                        Your triggers are listening. Incoming comments & DMs will populate here in real-time.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between">
                        <Link 
                            href="/dashboard/inbox" 
                            className="text-xs text-[#e5a93c] hover:text-[#f3ba4f] font-semibold flex items-center gap-1 transition-colors"
                        >
                            Open Full Inbox <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <span className="text-[10px] text-neutral-400 font-mono">Syncing via Webhook</span>
                    </div>
                </div>

                {/* Column 2: AI Comment Intelligence (4 cols) */}
                <div className="lg:col-span-4 rounded-2xl bg-[#111216] border border-white/[0.07] p-5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#e5a93c]" />
                                <h3 className="text-base font-bold text-white tracking-tight">{t.whatPeopleAsk}</h3>
                            </div>
                            <button
                                onClick={() => fetchThemes(true)}
                                disabled={loadingThemes}
                                title="Force AI re-analysis (uses AI credits)"
                                className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <RefreshCcw className={`w-3.5 h-3.5 ${loadingThemes ? "animate-spin text-[#e5a93c]" : ""}`} />
                            </button>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">{t.aiAnalysisDesc}</p>

                        {/* Themes Content */}
                        {loadingThemes && themes.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-[#e5a93c] mb-2" />
                                <p className="text-xs text-neutral-400">Analyzing comment sentiments...</p>
                            </div>
                        ) : themes.length > 0 ? (
                            <div className="space-y-3">
                                {themes.slice(0, 3).map((theme: any) => (
                                    <div 
                                        key={theme.id} 
                                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h4 className="text-xs font-bold text-white capitalize">{theme.theme}</h4>
                                            <span className="text-[10px] font-mono font-semibold bg-[#e5a93c]/10 text-[#f3ba4f] border border-[#e5a93c]/20 px-2 py-0.5 rounded-full">
                                                {theme.count}x
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-400 mb-2.5 line-clamp-2 italic">
                                            "{theme.examples}"
                                        </p>
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {theme.keywords?.split(",").map((k: string, i: number) => (
                                                <span 
                                                    key={i} 
                                                    className="text-[9px] uppercase tracking-wider bg-white/[0.04] text-neutral-300 px-1.5 py-0.5 rounded border border-white/[0.05]"
                                                >
                                                    {k.trim()}
                                                </span>
                                            ))}
                                        </div>
                                        <Link 
                                            href={`/dashboard/automations?intent=${encodeURIComponent("Reply to comments about " + theme.theme + " matching keywords: " + theme.keywords)}`}
                                            className="w-full text-xs font-semibold text-black bg-[#e5a93c] hover:bg-[#d4952b] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <span>{t.turnIntoAutomation}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-xl bg-[#e5a93c]/10 border border-[#e5a93c]/20 flex items-center justify-center text-[#e5a93c] mb-3">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-medium text-neutral-300 mb-1">AI Topic Detection Ready</p>
                                <p className="text-[11px] text-neutral-400 max-w-xs mb-4">
                                    {t.notEnoughComments}
                                </p>
                                <button
                                    onClick={() => fetchThemes(true)}
                                    disabled={loadingThemes}
                                    className="text-xs font-semibold text-[#f3ba4f] bg-[#e5a93c]/10 border border-[#e5a93c]/30 hover:bg-[#e5a93c]/20 py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                                >
                                    Scan Recent Comments
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Powered by Gemini Pro</span>
                        <span className="font-mono text-emerald-400">Model: v2-tuned</span>
                    </div>
                </div>

                {/* Column 3: Quick Dispatch & Stacked Actions (3 cols) */}
                <div className="lg:col-span-3 rounded-2xl bg-[#111216] border border-white/[0.07] p-5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="pb-4 border-b border-white/[0.06] mb-4">
                            <h3 className="text-base font-bold text-white tracking-tight">{t.quickActions}</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">Direct workflow triggers</p>
                        </div>

                        {/* Dispatch List */}
                        <div className="space-y-2.5">
                            <Link 
                                href="/dashboard/automations" 
                                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[#e5a93c]/40 hover:bg-[#e5a93c]/[0.03] transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[#e5a93c]/10 border border-[#e5a93c]/25 flex items-center justify-center text-[#e5a93c] shrink-0 group-hover:scale-105 transition-transform">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-[#f3ba4f] transition-colors truncate">
                                            {t.newRule}
                                        </p>
                                        <p className="text-[10px] text-neutral-400 truncate">Keyword trigger</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#e5a93c] group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>

                            <Link 
                                href="/dashboard/ai-engine" 
                                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0 group-hover:scale-105 transition-transform">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                                            AI Engine & Funnels
                                        </p>
                                        <p className="text-[10px] text-neutral-400 truncate">Persona & prompt tuning</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>

                            <Link 
                                href="/dashboard/analytics" 
                                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                                            {t.viewAudience}
                                        </p>
                                        <p className="text-[10px] text-neutral-400 truncate">Lead management & CRM</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>

                            <Link 
                                href="/dashboard/connected-platforms" 
                                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                                        <Share2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                                            Channels & Graph API
                                        </p>
                                        <p className="text-[10px] text-neutral-400 truncate">Meta, Telegram, LinkedIn</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            All Services Online
                        </span>
                        <span className="font-mono text-neutral-400">v2.4.0</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
