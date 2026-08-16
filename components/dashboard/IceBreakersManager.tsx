"use client"

import { useState, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Save, RefreshCw, Brain, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { IceBreaker } from "@/types/db"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
import { readCache, cachedFetch, clearCache } from "@/lib/client-cache"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export function IceBreakersManager() {
    const { userId, isLoading } = useInstagramSession()
    const [breakers, setBreakers] = useState<Partial<IceBreaker>[]>([])
    const [saving, setSaving] = useState(false)
    const [fetching, setFetching] = useState(true)
    const { t } = useLanguage()

    // AI Config State
    const { data: aiData, mutate: mutateAi } = useSWR(
        userId ? `/api/groq/auto-reply?userId=${userId}` : null,
        fetcher
    )
    const aiEnabled = aiData?.enabled ?? false
    
    const [aiToggling, setAiToggling] = useState(false)
    const [aiContext, setAiContext] = useState("")
    const [aiContextSaving, setAiContextSaving] = useState(false)
    const [aiContextSaved, setAiContextSaved] = useState(false)

    useEffect(() => {
        if (aiData?.ai_context !== undefined) {
            setAiContext(aiData.ai_context)
        }
    }, [aiData])

    const handleSaveAiContext = async () => {
        if (aiContextSaving) return
        setAiContextSaving(true)
        try {
            await fetch("/api/groq/auto-reply", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, enabled: aiEnabled, ai_context: aiContext }),
            })
            mutateAi()
            setAiContextSaved(true)
            setTimeout(() => setAiContextSaved(false), 2000)
        } catch {}
        setAiContextSaving(false)
    }

    const handleToggleAI = async () => {
        if (aiToggling) return
        setAiToggling(true)
        const newState = !aiEnabled
        try {
            const res = await fetch("/api/groq/auto-reply", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, enabled: newState }),
            })
            if (res.ok) {
                mutateAi()
            }
        } catch {}
        setAiToggling(false)
    }

    useEffect(() => {
        if (!userId) return
        const cacheKey = `/api/ice-breakers?userId=${userId}`
        const cached = readCache<IceBreaker[]>(cacheKey)
        if (cached) {
            setBreakers(cached)
            setFetching(false)
        }
        cachedFetch(cacheKey, async () => {
            const res = await fetch(`/api/ice-breakers?userId=${userId}`)
            const data = await res.json()
            return Array.isArray(data) ? data : []
        })
            .then(data => {
                setBreakers(data)
                setFetching(false)
            })
            .catch(err => {
                console.error(err)
                setFetching(false)
            })
    }, [userId])

    const handleAdd = () => {
        if (breakers.length >= 4) {
            toast.error("Maximum 4 Ice Breakers allowed by Instagram")
            return
        }
        setBreakers([...breakers, { question: "", response: "" }])
    }

    const handleChange = (index: number, field: "question" | "response", value: string) => {
        const newBreakers = [...breakers]
        newBreakers[index] = { ...newBreakers[index], [field]: value }
        setBreakers(newBreakers)
    }

    const handleRemove = (index: number) => {
        setBreakers(breakers.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!userId) return

        // Validation
        if (breakers.some(b => !b.question?.trim() || !b.response?.trim())) {
            toast.error("Please fill in all fields")
            return
        }

        setSaving(true)
        try {
            const res = await fetch("/api/ice-breakers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, iceBreakers: breakers })
            })
            const data = await res.json()
            if (data.success) {
                clearCache(`/api/ice-breakers?userId=${userId}`)
                if (data.warning) {
                    toast.error(`Saved to DB, but Instagram sync failed: ${data.error?.message || 'Rate limit or API error'}`)
                } else {
                    toast.success("Ice Breakers saved & synced successfully!")
                }
            } else {
                toast.error(data.error || "Failed to save")
            }
        } catch (e) {
            toast.error("Error saving")
        } finally {
            setSaving(false)
        }
    }

    if (isLoading || fetching && !breakers.length && userId) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#ffe14d]" /></div>
    }

    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#03010A] p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to manage ice breakers." />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-serif-display text-3xl text-white">{t.iceBreakersTitle}</h2>
                    <p className="text-muted-foreground text-sm">
                        {t.iceBreakersDesc}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* AI Auto-Reply Toggle */}
                    {aiData === undefined ? (
                        <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                    ) : (
                        <button
                            onClick={handleToggleAI}
                            disabled={aiToggling}
                            className={`flex items-center gap-2 h-9 px-4 rounded-full font-mono-ui text-[11px] font-bold uppercase tracking-widest transition-colors ${
                                aiEnabled
                                    ? 'bg-[#ffe14d]/10 border border-[#ffe14d]/40 text-[#ffe14d]'
                                    : 'border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'
                            }`}
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${aiToggling ? 'animate-pulse' : ''}`} />
                            {aiToggling ? '...' : aiEnabled ? 'AI ON' : 'AI OFF'}
                        </button>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="bg-[#ffe14d] hover:brightness-95 text-black font-bold">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save & Sync
                    </Button>
                </div>
            </div>

            {/* AI Context Panel */}
            <div className="rounded-2xl border border-[#ffe14d]/20 bg-[#ffe14d]/[0.04] p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#ffe14d]" />
                    <span className="text-sm font-semibold text-[#ffe14d]">AI Personality Context</span>
                </div>
                <p className="text-xs text-neutral-500">Tell AI about your account — niche, products, tone, what to say/avoid. More context = more human replies.</p>
                <Textarea
                    value={aiContext}
                    onChange={e => setAiContext(e.target.value)}
                    placeholder={`e.g. This is a fitness coaching account. I sell online training programs (₹2999/mo). My tone is motivating but chill. If someone asks about pricing, tell them to DM for a free consultation. Never promise specific results.`}
                    rows={4}
                    className="w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50 transition-colors"
                />
                <button
                    onClick={handleSaveAiContext}
                    disabled={aiContextSaving}
                    className="px-4 py-2 rounded-xl bg-[#ffe14d] hover:brightness-95 text-black text-xs font-bold transition-all disabled:opacity-50"
                >
                    {aiContextSaving ? 'Saving...' : aiContextSaved ? 'Saved ✓' : 'Save AI Context'}
                </button>
            </div>

            <div className="space-y-4">
                {breakers.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3 relative group">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground font-semibold uppercase">Question</label>
                                    <Input
                                        value={item.question}
                                        onChange={e => handleChange(idx, "question", e.target.value)}
                                        placeholder="e.g., What are your prices?"
                                        className="bg-black/20 border-white/10 mt-1"
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-semibold uppercase">Auto-Response</label>
                                    <Textarea
                                        value={item.response}
                                        onChange={e => handleChange(idx, "response", e.target.value)}
                                        placeholder="The reply users will receive..."
                                        className="bg-black/20 border-white/10 mt-1"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(idx)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {breakers.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-muted-foreground">
                        No ice breakers yet. Add one to get started!
                    </div>
                )}

                {breakers.length < 4 && (
                    <Button variant="outline" onClick={handleAdd} className="w-full border-dashed border-white/20 hover:bg-white/5 text-muted-foreground hover:text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                )}
            </div>

            <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl flex gap-3 text-sm text-neutral-300">
                <RefreshCw className="w-5 h-5 shrink-0" />
                <p>
                    Changes made here are automatically synced to your Instagram Profile. It may take a few minutes for them to appear for all users.
                </p>
            </div>
        </div>
    )
}
