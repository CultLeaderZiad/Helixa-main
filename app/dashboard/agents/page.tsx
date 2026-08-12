"use client"

import { useState, useEffect } from "react"
import { Loader2, Lock, KeyRound, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"
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

export default function DashboardAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const [byokDialog, setByokDialog] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [byokKey, setByokKey] = useState("")
  const [byokProvider, setByokProvider] = useState("gemini")
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents")
      if (!res.ok) throw new Error("Failed to load agents")
      const data = await res.json()
      setAgents(data.agents || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAgent = async (agentId: string, currentState: boolean) => {
    try {
      // Optimistic update
      setAgents(agents.map(a => a.id === agentId ? { ...a, settings: { ...a.settings, is_enabled: !currentState } } : a))
      
      // We hardcode accountId for now since auth context is skipped
      const accountId = "00000000-0000-0000-0000-000000000000"
      
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, agentId, is_enabled: !currentState }),
      })
    } catch (err) {
      fetchAgents()
      alert("Failed to update status")
    }
  }

  const handleSaveByok = async () => {
    if (!byokKey || !selectedAgentId) return
    setSavingKey(true)
    try {
      const accountId = "00000000-0000-0000-0000-000000000000"
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          agentId: selectedAgentId,
          byok_key: byokKey,
          byok_provider: byokProvider,
        }),
      })

      if (!res.ok) throw new Error("Failed to save key")
      
      setByokDialog(false)
      setByokKey("")
      fetchAgents()
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

  // Group by category
  const groupedAgents = agents.reduce((acc, agent) => {
    const cat = agent.category || "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(agent)
    return acc
  }, {} as Record<string, Agent[]>)

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>

  return (
    <div className="p-8 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl text-white mb-2">{t.aiAgentsTitle}</h1>
        <p className="text-neutral-400 text-sm">
          {t.aiAgentsDesc}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {Object.entries(groupedAgents).map(([category, catAgents]) => (
        <div key={category} className="mb-12">
          <h2 className="text-lg font-bold text-white mb-4 capitalize">{category} Agents</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catAgents.map((agent) => (
              <div
                key={agent.id}
                className={`border border-white/10 bg-white/[0.03] rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden ${
                  !agent.is_unlocked ? "opacity-75" : ""
                }`}
              >
                {!agent.is_unlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-8 h-8 text-neutral-500 mb-3" />
                    <h4 className="font-bold text-white mb-1">{t.planUpgradeRequired}</h4>
                    <p className="text-xs text-neutral-400 mb-4">
                      {t.agentNotInPlan}
                    </p>
                    <Link href="/dashboard/billing">
                      <Button className="bg-[#ffe14d] text-black hover:brightness-110 h-8 text-xs">
                        {t.viewPlans}
                      </Button>
                    </Link>
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white">{agent.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-3">
                      {agent.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                  {agent.requires_byok ? (
                    agent.settings?.byok_connected_at ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.keyConnected}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-white/10 hover:bg-white/5"
                        onClick={() => openByok(agent)}
                        disabled={!agent.is_unlocked}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        {t.connectApiKey}
                      </Button>
                    )
                  ) : (
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <span>{t.managedByHelixa}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        agent.settings?.is_enabled ? "text-green-400" : "text-neutral-500"
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
                className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white"
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
            <Button onClick={handleSaveByok} disabled={savingKey || !byokKey}>
              {savingKey ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.secureAndConnect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
