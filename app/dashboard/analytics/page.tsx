"use client"

import { Activity, Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function AnalyticsPage() {
    const [summary, setSummary] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)

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

                <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <h3 className="text-xl text-white mb-2">Deep Analytics</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
                        Detailed charts and performance metrics are currently in development.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-neutral-400 text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/10">
                        Coming Soon
                    </div>
                </div>
            </div>
        </div>
    )
}
