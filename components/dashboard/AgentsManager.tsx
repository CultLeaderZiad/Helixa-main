"use client"

import { useState } from "react"
import { Loader2, Lock, KeyRound, CheckCircle2, Bot, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AgentSetting {
  is_enabled: boolean
  byok_provider?: string
  byok_connected_at?: string
}

interface Agent {
  id: string
  name: string
  description: string
  category: string
  provider: string
  requires_byok: boolean
  is_unlocked: boolean
  settings: AgentSetting
}

export function AgentsManager() {
  const { data: agentsData, error: swrError, isLoading: loading, mutate: mutateAgents } = useSWR("/api/agents", fetcher)
  const agents: Agent[] = agentsData?.agents || []
  const error = swrError?.message || ""
  const { t } = useLanguage()

  const [byokDialog, setByokDialog] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [byokKey, setByokKey] = useState("")
  const [byokProvider, setByokProvider] = useState("gemini")
  const [savingKey, setSavingKey] = useState(false)

  const handleToggleAgent = async (agentId: string, currentState: boolean) => {
    try {
      mutateAgents((prev: any) => ({
        ...prev,
        agents: prev?.agents?.map((a: Agent) => a.id === agentId ? { ...a, settings: { ...a.settings, is_enabled: !currentState } } : a)
      }), false)
      
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, is_enabled: !currentState }),
      })
    } catch (err) {
      mutateAgents()
      alert("Failed to update status")
    }
  }

  const handleSaveByok = async () => {
    if (!byokKey || !selectedAgentId) return
    setSavingKey(true)
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          byok_key: byokKey,
          byok_provider: byokProvider,
        }),
      })

      if (!res.ok) throw new Error("Failed to save key")
      
      setByokDialog(false)
      setByokKey("")
      mutateAgents()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingKey(false)
    }
  }

  const openByok = (agent: Agent) => {
    setSelectedAgentId(agent.id)
    setByokProvider(agent.provider === 'byok' ? 'openrouter' : agent.provider)
    setByokDialog(true)
  }

  const groupedAgents = agents.reduce((acc: Record<string, Agent[]>, agent: Agent) => {
    const cat = agent.category || "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(agent)
    return acc
  }, {} as Record<string, Agent[]>)

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h2 className="font-serif-display text-2xl md:text-3xl text-white mb-1.5">{t.aiAgentsTitle}</h2>
          <p className="text-neutral-400 text-xs sm:text-sm">
            {t.aiAgentsDesc}
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-2 text-[#ffe14d]" />
            Manage Tier & Access
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {agents.length === 0 && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <Bot className="w-7 h-7 text-neutral-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No AI Agents Configured Yet</h3>
          <p className="text-sm text-neutral-400 mb-6">
            AI agents supercharge your conversations with automated responses and lead capture. You can create custom trigger rules while agents are configured.
          </p>
          <Link href="/dashboard/automations">
            <Button className="bg-[#ffe14d] text-black hover:brightness-110 text-xs font-semibold">
              Create an Automation Rule
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {Object.entries(groupedAgents).map(([category, catAgents]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 font-mono-ui">
            <span>{category} Agents</span>
            <span className="bg-white/10 text-xs text-neutral-300 px-2 py-0.5 rounded-full font-mono font-normal">
              {catAgents.length}
            </span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catAgents.map((agent: Agent) => (
              <div
                key={agent.id}
                className={`border border-white/[0.08] bg-[#0c0a13]/80 backdrop-blur-sm rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all hover:border-white/20 shadow-lg ${
                  !agent.is_unlocked ? "opacity-75" : ""
                }`}
              >
                {!agent.is_unlocked && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-7 h-7 text-neutral-500 mb-2.5" />
                    <h4 className="font-bold text-white text-sm mb-1">{t.planUpgradeRequired}</h4>
                    <p className="text-xs text-neutral-400 mb-3">
                      {t.agentNotInPlan}
                    </p>
                    <Link href="/dashboard/billing">
                      <Button className="bg-[#ffe14d] text-black hover:brightness-110 h-7 text-xs font-semibold px-3">
                        {t.viewPlans}
                      </Button>
                    </Link>
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-3 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  {agent.requires_byok ? (
                    agent.settings?.byok_connected_at ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.keyConnected}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-white/10 hover:bg-white/10"
                        onClick={() => openByok(agent)}
                        disabled={!agent.is_unlocked}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1.5 text-[#ffe14d]" />
                        {t.connectApiKey}
                      </Button>
                    )
                  ) : (
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono-ui">
                      <span>{t.managedByHelixa}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold font-mono-ui ${
                        agent.settings?.is_enabled ? "text-emerald-400" : "text-neutral-500"
                      }`}
                    >
                      {agent.settings?.is_enabled ? t.activeLabel : t.off}
                    </span>
                    <Switch
                      checked={agent.settings?.is_enabled || false}
                      onCheckedChange={() => handleToggleAgent(agent.id, agent.settings?.is_enabled || false)}
                      disabled={!agent.is_unlocked || (agent.requires_byok && !agent.settings?.byok_connected_at)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={byokDialog} onOpenChange={setByokDialog}>
        <DialogContent className="bg-[#0b0b0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{t.connectApiKeyTitle}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {t.byokDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">{t.provider}</label>
              <select
                className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#ffe14d] outline-none"
                value={byokProvider}
                onChange={(e) => setByokProvider(e.target.value)}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">{t.apiKey}</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={byokKey}
                onChange={e => setByokKey(e.target.value)}
                className="bg-black border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setByokDialog(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveByok} disabled={savingKey || !byokKey} className="bg-[#ffe14d] text-black font-semibold hover:brightness-110">
              {savingKey ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.secureAndConnect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
