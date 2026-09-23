"use client"

import { Activity, Sparkles, Loader2, GitMerge, Filter, MessageCircle, Send, RefreshCw, Zap, X, Hash } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { EmptyState } from "@/components/ui/EmptyState"

function timeAgo(isoString: string | null): string {
    if (!isoString) return "Never"
    const diffMs = Date.now() - new Date(isoString).getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 1) return "< 1 hour ago"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export function AnalyticsDashboardView() {
    const router = useRouter()
    const { t } = useLanguage()
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const [summary, setSummary] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)

    const { data: connectionsData } = useSWR("/api/user/connections", fetcher)
    const connections = connectionsData?.connections || []
    const hasAnyConnection = connections.length > 0

    const { data: funnelData, isLoading: funnelLoading } = useSWR(
        userId ? `/api/analytics/funnel?userId=${userId}` : null,
        fetcher
    )

    const { data: themesData, isLoading: themesLoading, mutate: mutateThemes } = useSWR(
        hasAnyConnection ? "/api/ai/analyze-comment-themes" : null,
        fetcher
    )
    const themes = themesData?.themes || []
    const themesLastAnalyzed = themesData?.last_analyzed_at || null
    const [themesRefreshing, setThemesRefreshing] = useState(false)

    const { data: faqsData, isLoading: faqsLoading, mutate: mutateFaqs } = useSWR(
        hasAnyConnection ? "/api/ai/analyze-inbox-faqs" : null,
        fetcher
    )
    const faqs = faqsData?.faqs || []
    const faqsLastAnalyzed = faqsData?.last_analyzed_at || null
    const [faqsRefreshing, setFaqsRefreshing] = useState(false)
    const [dismissingFaqId, setDismissingFaqId] = useState<string | null>(null)

    const handleRefreshThemes = async () => {
        setThemesRefreshing(true)
        try {
            const res = await fetch("/api/ai/analyze-comment-themes?force=true")
            const data = await res.json()
            if (data.themes) mutateThemes(data, false)
            if (data.error) toast.error(data.error)
            else toast.success("Comment themes refreshed!")
        } catch {
            // silent
        } finally {
            setThemesRefreshing(false)
        }
    }

    const handleRefreshFaqs = async () => {
        setFaqsRefreshing(true)
        try {
            const res = await fetch("/api/ai/analyze-inbox-faqs?force=true")
            const data = await res.json()
            if (data.faqs) mutateFaqs(data, false)
            if (data.error) toast.error(data.error)
            else toast.success("FAQ suggestions refreshed!")
        } catch {
            // silent
        } finally {
            setFaqsRefreshing(false)
        }
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
                mutateFaqs((prev: any) => ({ ...prev, faqs: prev?.faqs?.filter((f: any) => f.id !== faqId) }), false)
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

    if (isSessionLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e5a93c]" /></div>

    if (!hasAnyConnection) {
        return (
            <div className="py-12">
                <EmptyState
                    icon={Activity}
                    badge="Integrations Required"
                    title="Connect Your Platforms"
                    description="Connect at least one social channel (Instagram, Facebook, or Telegram) to view live analytics, engagement metrics, and Groq-powered AI insights."
                    action={{
                        label: "Connect Platforms",
                        href: "/dashboard/connected-platforms",
                    }}
                />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid gap-6">
                {/* AI Performance Insights */}
                <div className="bg-[#0c0a13]/80 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-50" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Sparkles className="w-5 h-5" />
                                <h3 className="font-bold uppercase tracking-wider text-sm font-mono-ui">AI Performance Insights</h3>
                            </div>
                            <button
                                onClick={generateInsight}
                                disabled={loading}
                                className="text-[10px] font-bold uppercase tracking-wider bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-mono-ui"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {hasLoaded ? "Regenerate" : "Generate Insight"}
                            </button>
                        </div>
                        
                        {summary ? (
                            <div className="text-sm text-neutral-300 leading-relaxed bg-black/40 p-5 rounded-xl border border-white/5 whitespace-pre-wrap font-sans">
                                {summary}
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500 flex items-center justify-center min-h-[90px] border border-dashed border-white/10 rounded-xl">
                                Click generate to get AI-powered insights on your account performance.
                            </div>
                        )}
                    </div>
                </div>

                {/* Comment Themes */}
                <div className="bg-[#0c0a13]/80 border border-[#e5a93c]/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-[#e5a93c]" />
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono-ui">What People Are Asking (Comments)</h3>
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
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 font-mono-ui"
                                >
                                    <RefreshCw className={`w-3 h-3 ${themesRefreshing ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {themesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                            </div>
                        ) : themes.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                                <p className="text-sm text-neutral-500">Not enough comments analyzed yet to detect themes.</p>
                                <p className="text-xs text-neutral-600 mt-1">Themes cluster automatically as people comment on your automated posts.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {themes.map((t: any) => (
                                    <div key={t.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/15 transition-all">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <h4 className="text-sm font-semibold text-white">{t.theme}</h4>
                                                <span className="text-[10px] font-mono-ui bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full shrink-0">
                                                    {t.count} comments
                                                </span>
                                            </div>
                                            {t.examples && (
                                                <p className="text-xs text-neutral-400 italic mb-3 line-clamp-2">
                                                    &ldquo;{t.examples.split(",")[0].replace(/^"|"$/g, "")}&rdquo;
                                                </p>
                                            )}
                                            {t.keywords && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {t.keywords.split(",").slice(0, 4).map((kw: string) => (
                                                        <span key={kw} className="text-[9px] font-mono-ui bg-[#e5a93c]/10 text-[#e5a93c] px-1.5 py-0.5 rounded">
                                                            #{kw.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleTurnThemeIntoAutomation(t)}
                                            className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#e5a93c]/10 hover:bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/20 py-2 rounded-lg transition-all font-mono-ui"
                                        >
                                            <Zap className="w-3 h-3" />
                                            Turn into Automation
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FAQ Suggestions */}
                <div className="bg-[#0c0a13]/80 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-400" />
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono-ui">Frequent Questions Detected (Inbox)</h3>
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
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 font-mono-ui"
                                >
                                    <RefreshCw className={`w-3 h-3 ${faqsRefreshing ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {faqsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                            </div>
                        ) : faqs.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                                <p className="text-sm text-neutral-500">No repeated questions detected yet in your inbox.</p>
                                <p className="text-xs text-neutral-600 mt-1">When users ask similar questions in DMs, AI suggests instant auto-responses here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {faqs.map((faq: any) => (
                                    <div key={faq.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold text-white">{faq.question}</h4>
                                                <span className="text-[10px] font-mono-ui bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full shrink-0">
                                                    Asked {faq.count}x
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-400">
                                                <span className="text-neutral-500 font-mono-ui">Suggested Reply: </span>
                                                &ldquo;{faq.suggested_answer}&rdquo;
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleTurnFaqIntoAutomation(faq)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-lg transition-all font-mono-ui"
                                            >
                                                <Zap className="w-3 h-3" />
                                                Create Auto-Reply
                                            </button>
                                            <button
                                                onClick={() => handleDismissFaq(faq.id)}
                                                disabled={dismissingFaqId === faq.id}
                                                className="text-neutral-600 hover:text-neutral-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                title="Dismiss suggestion"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Conversion Funnel (Prompt 38 real data) */}
                <div className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-[#e5a93c]" />
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono-ui">Conversion Funnel (Real Data)</h3>
                        </div>
                    </div>

                    {funnelLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                        </div>
                    ) : funnelData?.funnel ? (
                        <div className="space-y-4">
                            {[
                                { key: "triggered", label: "Automations Triggered", color: "bg-blue-500" },
                                { key: "sent", label: "Messages Sent", color: "bg-indigo-500" },
                                { key: "replied", label: "User Replies", color: "bg-purple-500" },
                                { key: "converted", label: "Conversations Converted", color: "bg-[#e5a93c]" },
                            ].map((stage) => {
                                const count = funnelData.funnel[stage.key] || 0
                                const maxCount = Math.max(funnelData.funnel.triggered || 1, 1)
                                const percent = Math.min(100, Math.round((count / maxCount) * 100))

                                return (
                                    <div key={stage.key} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-mono-ui">
                                            <span className="text-neutral-400">{stage.label}</span>
                                            <span className="font-bold text-white">{count}</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500">No funnel data available yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
