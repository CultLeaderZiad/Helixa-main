"use client"

import { Activity, Sparkles, Loader2, GitMerge, Filter } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"

export default function AnalyticsPage() {
    const [summary, setSummary] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)
    const [funnelData, setFunnelData] = useState<any>(null)
    const [funnelLoading, setFunnelLoading] = useState<boolean>(true)
    const { userId, isLoading: isSessionLoading } = useInstagramSession()

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
            <div className="min-h-[calc(100vh-64px)] bg-[#03010A] p-4 flex items-center justify-center">
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
                    <h1 className="font-serif-display text-3xl text-white">Analytics</h1>
                    <p className="text-sm text-muted-foreground">Monitor performance and AI insights</p>
                </div>
            </div>

            <div className="grid gap-6">
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
