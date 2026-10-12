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
import { Button } from "@/components/ui/button"

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
                    badge="Integrations required"
                    title="Connect your platforms"
                    description="Connect at least one social channel (Instagram, Facebook, or Telegram) to view live analytics, engagement metrics, and AI performance insights."
                    action={{
                        label: "Connect platforms",
                        href: "/dashboard/connected-platforms",
                    }}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-5">
                {/* AI Performance Insights */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--gold)]">
                            <Sparkles className="w-4 h-4" />
                            <h3 className="text-sm font-semibold text-[var(--t1)]">AI performance insights</h3>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={generateInsight}
                            disabled={loading}
                            className="h-[28px] text-xs font-medium gap-1.5"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            <span>{hasLoaded ? "Regenerate" : "Generate insight"}</span>
                        </Button>
                    </div>

                    {summary ? (
                        <div className="text-xs text-[var(--t2)] leading-relaxed bg-[var(--s2)] p-4 rounded-lg border border-[var(--line)] whitespace-pre-wrap">
                            {summary}
                        </div>
                    ) : (
                        <div className="text-xs text-[var(--t3)] flex items-center justify-center min-h-[70px] border border-dashed border-[var(--line2)] rounded-lg">
                            Click generate to get AI-powered insights on your account performance.
                        </div>
                    )}
                </div>

                {/* Comment Themes */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--gold)]">
                            <MessageCircle className="w-4 h-4" />
                            <h3 className="text-sm font-semibold text-[var(--t1)]">What people are asking (comments)</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {themesLastAnalyzed && (
                                <span className="text-[10.5px] text-[var(--t3)] font-mono">
                                    Updated {timeAgo(themesLastAnalyzed)}
                                </span>
                            )}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRefreshThemes}
                                disabled={themesRefreshing}
                                className="h-[26px] px-2.5 text-[11px] gap-1"
                            >
                                <RefreshCw className={`w-3 h-3 ${themesRefreshing ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </div>

                    {themesLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />
                        </div>
                    ) : themes.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[var(--line2)] rounded-lg">
                            <p className="text-xs text-[var(--t3)]">Not enough comments analyzed yet to detect themes.</p>
                            <p className="text-[11px] text-[var(--t4)] mt-0.5">Themes cluster automatically as people comment on your automated posts.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {themes.map((t: any) => (
                                <div key={t.id} className="bg-[var(--s2)] border border-[var(--line)] rounded-lg p-3.5 flex flex-col justify-between hover:border-[var(--line2)] transition-colors">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="text-[13px] font-semibold text-[var(--t1)]">{t.theme}</h4>
                                            <span className="text-[10px] font-mono bg-[var(--s3)] text-[var(--t3)] border border-[var(--line)] px-2 py-0.5 rounded shrink-0">
                                                {t.count} comments
                                            </span>
                                        </div>
                                        {t.examples && (
                                            <p className="text-[11.5px] text-[var(--t3)] italic mb-2 line-clamp-2">
                                                &ldquo;{t.examples.split(",")[0].replace(/^"|"$/g, "")}&rdquo;
                                            </p>
                                        )}
                                        {t.keywords && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {t.keywords.split(",").slice(0, 4).map((kw: string) => (
                                                    <span key={kw} className="text-[10px] font-mono bg-[var(--goldbg)] text-[var(--gold2)] border border-[var(--goldline)] px-1.5 py-0.5 rounded">
                                                        #{kw.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleTurnThemeIntoAutomation(t)}
                                        className="h-[28px] text-[11px] gap-1 font-medium w-full"
                                    >
                                        <Zap className="w-3 h-3 text-[var(--gold)]" />
                                        <span>Turn into automation</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FAQ Suggestions */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--gold)]">
                            <Send className="w-4 h-4" />
                            <h3 className="text-sm font-semibold text-[var(--t1)]">Frequent questions detected (inbox)</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {faqsLastAnalyzed && (
                                <span className="text-[10.5px] text-[var(--t3)] font-mono">
                                    Updated {timeAgo(faqsLastAnalyzed)}
                                </span>
                            )}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRefreshFaqs}
                                disabled={faqsRefreshing}
                                className="h-[26px] px-2.5 text-[11px] gap-1"
                            >
                                <RefreshCw className={`w-3 h-3 ${faqsRefreshing ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </div>

                    {faqsLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[var(--line2)] rounded-lg">
                            <p className="text-xs text-[var(--t3)]">No repeated questions detected yet in your inbox.</p>
                            <p className="text-[11px] text-[var(--t4)] mt-0.5">When users ask similar questions in DMs, AI suggests instant auto-responses here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {faqs.map((faq: any) => (
                                <div key={faq.id} className="bg-[var(--s2)] border border-[var(--line)] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--line2)] transition-colors">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-[13px] font-semibold text-[var(--t1)]">{faq.question}</h4>
                                            <span className="text-[10px] font-mono bg-[var(--s3)] text-[var(--t3)] border border-[var(--line)] px-2 py-0.5 rounded shrink-0">
                                                Asked {faq.count}x
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--t3)]">
                                            <span className="text-[var(--t4)] font-mono">Suggested reply: </span>
                                            &ldquo;{faq.suggested_answer}&rdquo;
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleTurnFaqIntoAutomation(faq)}
                                            className="h-[28px] text-[11px] gap-1 font-medium"
                                        >
                                            <Zap className="w-3 h-3 text-[var(--gold)]" />
                                            <span>Create auto-reply</span>
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => handleDismissFaq(faq.id)}
                                            disabled={dismissingFaqId === faq.id}
                                            className="text-[var(--t3)] hover:text-[var(--t1)] p-1 rounded hover:bg-[var(--s3)] transition-colors cursor-pointer"
                                            title="Dismiss suggestion"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Conversion Funnel (Real Data) */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--gold)]">
                            <Filter className="w-4 h-4" />
                            <h3 className="text-sm font-semibold text-[var(--t1)]">Conversion funnel (real data)</h3>
                        </div>
                    </div>

                    {funnelLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />
                        </div>
                    ) : funnelData?.funnel ? (
                        <div className="space-y-3">
                            {[
                                { key: "triggered", label: "Automations triggered", opacity: "opacity-40" },
                                { key: "sent", label: "Messages sent", opacity: "opacity-55" },
                                { key: "replied", label: "Messages received", opacity: "opacity-70" },
                                { key: "link_clicked", label: "Link clicks", opacity: "opacity-85" },
                                { key: "leads", label: "Leads captured", opacity: "opacity-100" },
                            ].map((stage) => {
                                const count = funnelData.funnel[stage.key] || 0
                                const maxCount = Math.max(funnelData.funnel.triggered || 1, 1)
                                const percent = Math.min(100, Math.round((count / maxCount) * 100))

                                return (
                                    <div key={stage.key} className="space-y-1">
                                        <div className="flex justify-between text-[11.5px]">
                                            <span className="text-[var(--t3)] font-medium">{stage.label}</span>
                                            <span className="font-mono text-[var(--t1)] font-semibold">{count}</span>
                                        </div>
                                        <div className="h-2 w-full bg-[var(--s2)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-[var(--gold)] ${stage.opacity} rounded-full transition-all duration-500`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--t3)]">No funnel data available yet.</p>
                    )}
                    {Array.isArray(funnelData?.series) && funnelData.series.some((day: { sent: number; inbound: number; linkClicks: number }) => day.sent || day.inbound || day.linkClicks) && (
                        <div className="mt-4 pt-3 border-t border-[var(--line)] space-y-1.5">
                            <p className="text-[10.5px] uppercase tracking-wider text-[var(--t3)] font-mono">Last 14 days</p>
                            {funnelData.series.filter((day: { sent: number; inbound: number; linkClicks: number }) => day.sent || day.inbound || day.linkClicks).map((day: { date: string; sent: number; inbound: number; linkClicks: number }) => (
                                <div key={day.date} className="flex items-center justify-between text-xs font-mono text-[var(--t3)]">
                                    <span>{day.date}</span>
                                    <span>{day.sent} sent · {day.inbound} received · {day.linkClicks} clicks</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
