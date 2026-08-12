"use client"

import { Activity, Sparkles, Loader2, GitMerge, Filter, MessageCircle, Send, RefreshCw, Zap, X, Hash } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

function timeAgo(isoString: string | null): string {
    if (!isoString) return "Never"
    const diffMs = Date.now() - new Date(isoString).getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 1) return "< 1 hour ago"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export default function AnalyticsPage() {
    const router = useRouter()
    const [summary, setSummary] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)
    const [funnelData, setFunnelData] = useState<any>(null)
    const [funnelLoading, setFunnelLoading] = useState<boolean>(true)
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const { t } = useLanguage()

    // Comment Themes
    const [themes, setThemes] = useState<any[]>([])
    const [themesLoading, setThemesLoading] = useState(true)
    const [themesLastAnalyzed, setThemesLastAnalyzed] = useState<string | null>(null)
    const [themesRefreshing, setThemesRefreshing] = useState(false)

    // FAQ Suggestions
    const [faqs, setFaqs] = useState<any[]>([])
    const [faqsLoading, setFaqsLoading] = useState(true)
    const [faqsLastAnalyzed, setFaqsLastAnalyzed] = useState<string | null>(null)
    const [faqsRefreshing, setFaqsRefreshing] = useState(false)
    const [dismissingFaqId, setDismissingFaqId] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return
        const fetchFunnel = async () => {
            try {
                const res = await fetch(`/api/analytics/funnel?userId=${userId}`)
                if (res.ok) {
                    const data = await res.json()
                    setFunnelData(data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setFunnelLoading(false)
            }
        }
        fetchFunnel()
    }, [userId])

    const fetchThemes = useCallback(async (force = false) => {
        try {
            const url = force ? "/api/ai/analyze-comment-themes?force=true" : "/api/ai/analyze-comment-themes"
            const res = await fetch(url)
            const data = await res.json()
            if (data.themes) {
                setThemes(data.themes)
                setThemesLastAnalyzed(data.last_analyzed_at || null)
            }
            if (data.error && data.themes === undefined) toast.error(data.error)
        } catch {
            // silent fail — themes are optional
        } finally {
            setThemesLoading(false)
            setThemesRefreshing(false)
        }
    }, [])

    const fetchFaqs = useCallback(async (force = false) => {
        try {
            const url = force ? "/api/ai/analyze-inbox-faqs?force=true" : "/api/ai/analyze-inbox-faqs"
            const res = await fetch(url)
            const data = await res.json()
            if (data.faqs) {
                setFaqs(data.faqs)
                setFaqsLastAnalyzed(data.last_analyzed_at || null)
            }
            if (data.error && data.faqs === undefined) toast.error(data.error)
        } catch {
            // silent fail
        } finally {
            setFaqsLoading(false)
            setFaqsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        if (!userId) return
        fetchThemes()
        fetchFaqs()
    }, [userId, fetchThemes, fetchFaqs])

    const handleRefreshThemes = async () => {
        setThemesRefreshing(true)
        await fetchThemes(true)
        toast.success("Comment themes refreshed!")
    }

    const handleRefreshFaqs = async () => {
        setFaqsRefreshing(true)
        await fetchFaqs(true)
        toast.success("FAQ suggestions refreshed!")
    }

    const handleDismissFaq = async (faqId: string) => {
        setDismissingFaqId(faqId)
        try {
            const res = await fetch("/api/ai/analyze-inbox-faqs", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faqId, dismiss: true })
            })
            if (res.ok) {
                setFaqs(prev => prev.filter(f => f.id !== faqId))
            } else {
                toast.error("Failed to dismiss")
            }
        } catch {
            toast.error("Failed to dismiss")
        } finally {
            setDismissingFaqId(null)
        }
    }

    const handleTurnThemeIntoAutomation = (theme: any) => {
        const intent = encodeURIComponent(`when people comment about "${theme.theme}", keywords: ${theme.keywords}`)
        router.push(`/dashboard/automations?intent=${intent}`)
    }

    const handleTurnFaqIntoAutomation = (faq: any) => {
        const intent = encodeURIComponent(`when people DM asking "${faq.question}", reply with: ${faq.suggested_answer}`)
        router.push(`/dashboard/automations?intent=${intent}`)
    }

    const generateInsight = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/ai/analytics-summary", {
                method: "POST",
            })
            const data = await res.json()
            if (data.summary) {
                setSummary(data.summary)
                setHasLoaded(true)
            } else if (data.error) {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error("Failed to generate AI Insights")
        } finally {
            setLoading(false)
        }
    }

    if (isSessionLoading) return <div className="h-screen flex items-center justify-center bg-[#03010A]"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>

    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-transparent p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to view analytics." />
            </div>
        )
    }

    return (
        <div className="flex flex-col p-8 animate-in fade-in duration-700 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center ring-1 ring-white/10">
                    <Activity className="w-6 h-6 text-[#ffe14d]" />
                </div>
                <div>
                    <h1 className="font-serif-display text-3xl text-white">{t.analyticsTitle}</h1>
                    <p className="text-sm text-muted-foreground">{t.analyticsDesc}</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* AI Performance Insights */}
                <div className="bg-neutral-900/40 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-50" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Sparkles className="w-5 h-5" />
                                <h2 className="font-bold uppercase tracking-wider text-sm">AI Performance Insights</h2>
                            </div>
                            <button
                                onClick={generateInsight}
                                disabled={loading}
                                className="text-[10px] font-bold uppercase tracking-wider bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {hasLoaded ? "Regenerate" : "Generate Insight"}
                            </button>
                        </div>
                        
                        {summary ? (
                            <div className="text-sm text-neutral-300 leading-relaxed bg-black/40 p-5 rounded-xl border border-white/5 whitespace-pre-wrap">
                                {summary}
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500 flex items-center justify-center min-h-[100px] border border-dashed border-white/10 rounded-xl">
                                Click generate to get AI-powered insights on your account performance.
                            </div>
                        )}
                    </div>
                </div>

                {/* Comment Themes */}
                <div className="bg-neutral-900/40 border border-[#ffe14d]/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-[#ffe14d]" />
                                <h2 className="font-bold text-white text-sm uppercase tracking-wider">What People Are Asking (Comments)</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {themesLastAnalyzed && (
                                    <span className="text-[10px] text-neutral-500 font-mono-ui">
                                        Updated {timeAgo(themesLastAnalyzed)}
                                    </span>
                                )}
                                <button
                                    onClick={handleRefreshThemes}
                                    disabled={themesRefreshing}
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${themesRefreshing ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {themesLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                        ) : themes.length === 0 ? (
                            <div className="text-center py-8 text-sm text-neutral-500 border border-dashed border-white/10 rounded-xl">
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>No comment themes yet.</p>
                                <p className="text-xs mt-1 text-neutral-600">Themes appear once you have enough recent comment activity.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {themes.map((theme: any) => (
                                    <div key={theme.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex items-start gap-4 group/theme hover:border-[#ffe14d]/20 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-white">{theme.theme}</span>
                                                <span className="text-[10px] bg-[#ffe14d]/10 text-[#ffe14d] px-2 py-0.5 rounded-full font-mono-ui">~{theme.count}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {(theme.keywords || "").split(",").map((kw: string) => kw.trim()).filter(Boolean).map((kw: string) => (
                                                    <span key={kw} className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Hash className="w-2.5 h-2.5" />{kw}
                                                    </span>
                                                ))}
                                            </div>
                                            {theme.examples && (
                                                <p className="text-xs text-neutral-500 italic line-clamp-1">&ldquo;{theme.examples}&rdquo;</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleTurnThemeIntoAutomation(theme)}
                                            className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#ffe14d]/10 hover:bg-[#ffe14d]/20 text-[#ffe14d] px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <Zap className="w-3 h-3" />
                                            Automate
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FAQ Suggestions */}
                <div className="bg-neutral-900/40 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-400" />
                                <h2 className="font-bold text-white text-sm uppercase tracking-wider">Inbox FAQ Suggestions</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {faqsLastAnalyzed && (
                                    <span className="text-[10px] text-neutral-500 font-mono-ui">
                                        Updated {timeAgo(faqsLastAnalyzed)}
                                    </span>
                                )}
                                <button
                                    onClick={handleRefreshFaqs}
                                    disabled={faqsRefreshing}
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${faqsRefreshing ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {faqsLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                        ) : faqs.length === 0 ? (
                            <div className="text-center py-8 text-sm text-neutral-500 border border-dashed border-white/10 rounded-xl">
                                <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>No FAQ suggestions yet.</p>
                                <p className="text-xs mt-1 text-neutral-600">Suggestions appear once you have enough recent DM activity.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {faqs.map((faq: any) => (
                                    <div key={faq.id} className="bg-black/30 border border-white/5 rounded-xl p-4 group/faq hover:border-blue-500/20 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-mono-ui shrink-0">×{faq.count}</span>
                                                </div>
                                                <p className="text-xs text-neutral-400 leading-relaxed bg-white/[0.03] px-3 py-2 rounded-lg border border-white/5">
                                                    {faq.suggested_answer}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDismissFaq(faq.id)}
                                                disabled={dismissingFaqId === faq.id}
                                                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all disabled:opacity-50"
                                                title="Dismiss"
                                            >
                                                {dismissingFaqId === faq.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => handleTurnFaqIntoAutomation(faq)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <Zap className="w-3 h-3" />
                                                Turn into Automation
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Funnel Analytics */}
                    <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 text-white mb-6">
                            <Filter className="w-5 h-5 text-blue-400" />
                            <h2 className="font-bold text-lg">Conversion Funnel</h2>
                        </div>
                        {funnelLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                        ) : funnelData?.funnel ? (
                            <div className="space-y-4 relative">
                                <div className="absolute left-6 top-6 bottom-6 w-px bg-white/10" />
                                {[
                                    { key: "triggered", label: "Triggered (Matched)", color: "text-neutral-400" },
                                    { key: "sent", label: "Sent Payload", color: "text-blue-400" },
                                    { key: "replied", label: "User Replied", color: "text-purple-400" },
                                    { key: "link_clicked", label: "Link Clicked", color: "text-pink-400" },
                                    { key: "converted", label: "Converted", color: "text-green-400" }
                                ].map((stage, i) => {
                                    const count = funnelData.funnel[stage.key] || 0;
                                    const maxCount = Math.max(funnelData.funnel.triggered || 1, 1);
                                    const pct = Math.round((count / maxCount) * 100);
                                    return (
                                        <div key={stage.key} className="flex items-center gap-4 relative z-10">
                                            <div className="w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center shrink-0 text-xs font-mono-ui font-bold text-white">
                                                {count}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className={`font-semibold ${stage.color}`}>{stage.label}</span>
                                                    <span className="text-neutral-500">{pct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-current ${stage.color}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500">No funnel data available yet.</p>
                        )}
                    </div>

                    {/* A/B Testing Variants */}
                    <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 text-white mb-6">
                            <GitMerge className="w-5 h-5 text-pink-400" />
                            <h2 className="font-bold text-lg">A/B Test Performance</h2>
                        </div>
                        {funnelLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                        ) : funnelData?.variants && funnelData.variants.length > 0 ? (
                            <div className="space-y-4">
                                {funnelData.variants.map((v: any) => {
                                    const rate = v.sent > 0 ? Math.round((v.converted / v.sent) * 100) : 0;
                                    return (
                                        <div key={v.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-semibold text-sm text-white">{v.name}</span>
                                                <span className="text-xs text-green-400 font-mono-ui font-bold">{rate}% CVR</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-white/5 rounded-lg py-2">
                                                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Sent</div>
                                                    <div className="text-sm text-white font-mono-ui">{v.sent}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-lg py-2">
                                                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Replied</div>
                                                    <div className="text-sm text-white font-mono-ui">{v.replied}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-lg py-2">
                                                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Conv.</div>
                                                    <div className="text-sm text-white font-mono-ui">{v.converted}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500">No active variants tracking data.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
