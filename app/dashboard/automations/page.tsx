"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm"
import { MessageCircle, Send, Sparkles, Zap, Plus, Brain, Loader2 } from "lucide-react"
import type { Automation } from "@/lib/types"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

function AutomationsPageContent() {
    const searchParams = useSearchParams()
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const { t } = useLanguage()
    const { data: roleData } = useSWR("/api/auth/me", fetcher)
    const userRole = roleData?.permission_level || "admin"

    const { data: automationsData, mutate: mutateAutomations, isLoading: isAutomationsLoading } = useSWR<Automation[]>(
        userId ? `/api/automations?userId=${userId}` : null,
        fetcher
    )
    const automations = Array.isArray(automationsData) ? automationsData : []

    const { data: connectionsData } = useSWR(
        userId ? `/api/user/connections` : null,
        fetcher
    )
    const connections = connectionsData?.connections || []
    const availablePlatforms = Array.from(new Set(connections.map((c: any) => c.platform))) as string[]
    if (userId && !availablePlatforms.includes("instagram")) availablePlatforms.unshift("instagram")

    const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram")
    const isLoading = isSessionLoading || isAutomationsLoading

    const [activeTab, setActiveTab] = useState<'comment' | 'dm' | 'story'>('comment')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editRule, setEditRule] = useState<Automation | null>(null)

    useEffect(() => {
        // Check for intent query param to open form
        const intent = searchParams?.get("intent")
        if (intent) {
            setShowCreateForm(true)
        }
    }, [searchParams])

    const handleDeleteRule = async (id: string) => {
        await fetch(`/api/automations?id=${id}`, { method: "DELETE" })
        mutateAutomations()
    }

    const handleEditRule = (rule: Automation) => {
        setEditRule(rule)
        setShowCreateForm(true)
    }

    const handleToggleRule = async (rule: Automation, active: boolean) => {

    if (isSessionLoading) return <div className="h-screen flex items-center justify-center bg-[#03010A]"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
    
    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-transparent p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to use automations." />
            </div>
        )
    }

    const platformAutomations = automations.filter(a => (a.platform || "instagram") === selectedPlatform)
    const filteredAutomations = platformAutomations.filter(a => a.trigger_source === activeTab)
    const counts = {
        comment: platformAutomations.filter(a => a.trigger_source === 'comment').length,
        dm: platformAutomations.filter(a => a.trigger_source === 'dm').length,
        story: platformAutomations.filter(a => a.trigger_source === 'story').length,
    }

    // Determine supported tabs by platform
    let supportedTabs: ('comment' | 'dm' | 'story')[] = ['comment', 'dm', 'story'] // instagram default
    if (selectedPlatform === 'facebook' || selectedPlatform === 'messenger') {
        supportedTabs = ['comment', 'dm']
    } else if (selectedPlatform === 'telegram' || selectedPlatform === 'whatsapp') {
        supportedTabs = ['dm']
    }

    useEffect(() => {
        if (!supportedTabs.includes(activeTab)) {
            setActiveTab(supportedTabs[0] || 'dm')
        }
    }, [selectedPlatform, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

    const tabs = [
        { key: 'comment' as const, icon: <MessageCircle className="w-4 h-4" />, label: 'Comments', count: counts.comment },
        { key: 'dm' as const, icon: <Send className="w-4 h-4" />, label: 'DMs', count: counts.dm },
        { key: 'story' as const, icon: <Sparkles className="w-4 h-4" />, label: 'Stories', count: counts.story },
    ].filter(t => supportedTabs.includes(t.key))

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-serif-display text-4xl md:text-5xl text-white leading-none">{t.automationsTitle}</h1>
                        <p className="text-neutral-400 text-sm mt-1">{t.rulesEngine}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {userRole !== "viewer" && (
                            <button
                                onClick={() => {
                                    if (showCreateForm) setEditRule(null)
                                    setShowCreateForm(!showCreateForm)
                                }}
                                className={`flex items-center gap-2 h-9 px-5 rounded-full font-mono-ui text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                                    showCreateForm
                                        ? 'border border-white/20 text-white hover:border-white/40'
                                        : 'bg-[#ffe14d] text-black hover:brightness-95'
                                }`}
                            >
                                <Plus className={`w-4 h-4 transition-transform duration-200 ${showCreateForm ? 'rotate-45' : ''}`} />
                                {showCreateForm ? 'Close' : 'New Rule'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Platform Switcher */}
                {availablePlatforms.length > 1 && (
                    <div className="flex gap-2 bg-white/5 p-1 rounded-full w-fit mb-4">
                        {availablePlatforms.map((platform) => (
                            <button
                                key={platform}
                                onClick={() => setSelectedPlatform(platform)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                                    selectedPlatform === platform
                                        ? 'bg-white text-black'
                                        : 'text-neutral-500 hover:text-white'
                                }`}
                            >
                                {platform}
                            </button>
                        ))}
                    </div>
                )}

                {/* Tabs — editorial underline */}
                <div className="flex items-center gap-6 border-b border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-2 pb-3 -mb-px font-mono-ui text-xs uppercase tracking-widest transition-colors border-b-2 ${
                                activeTab === tab.key
                                    ? 'text-white border-[#ffe14d]'
                                    : 'text-neutral-600 border-transparent hover:text-neutral-300'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === tab.key ? 'bg-[#ffe14d] text-black' : 'bg-white/10 text-neutral-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Create Form (Collapsible) */}
                {showCreateForm && (
                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0a] p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CreateRuleForm
                            userId={userId}
                            triggerSource={editRule ? editRule.trigger_source : activeTab}
                            editRule={editRule}
                            initialIntent={searchParams?.get("intent") || undefined}
                            defaultPlatform={selectedPlatform}
                            onSuccess={() => {
                                mutateAutomations()
                                setShowCreateForm(false)
                                setEditRule(null)
                            }}
                        />
                    </div>
                )}


                {/* Automation List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                ) : (
                    <AutomationList
                        automations={filteredAutomations}
                        onDelete={handleDeleteRule}
                        onEdit={handleEditRule}
                        onToggle={handleToggleRule}
                        onChanged={() => mutateAutomations()}
                        userId={userId}
                        userRole={userRole}
                        platform={selectedPlatform}
                    />
                )}
            </div>
        </div>
    )
}

export default function AutomationsPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#03010A]"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
            <AutomationsPageContent />
        </Suspense>
    )
}
