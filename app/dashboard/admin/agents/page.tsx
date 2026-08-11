"use client"

import { useState, useEffect } from "react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Agent {
  id: string
  agent_key: string
  name: string
  description: string
  provider: string
  category: string | null
  requires_byok: boolean
  is_active: boolean
  sort_order: number
}

export default function DashboardAdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setError("")
      const res = await fetch("/api/admin/agents")
      if (!res.ok) throw new Error("Failed to load agents")
      const data = await res.json()
      setAgents(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setAgents(agents.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a))
      
      const res = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
    } catch (err) {
      // Revert on error
      fetchAgents()
      alert("Failed to update status")
    }
  }

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setForm({
      name: agent.name,
      description: agent.description || "",
      category: agent.category || "",
    })
    setDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingAgent) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAgent.id,
          name: form.name,
          description: form.description,
          category: form.category,
        }),
      })

      if (!res.ok) throw new Error("Failed to update agent")
      
      setDialogOpen(false)
      fetchAgents()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    )
  }

  return (
    <div className="p-8 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl text-white mb-2">Agents Catalog</h1>
        <p className="text-neutral-400 text-sm">
          Manage AI features available across the platform. Disabling an agent here instantly turns it off for everyone.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="bg-[#0b0b0a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500">Name & Key</th>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500">Category</th>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500">Provider</th>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500">BYOK</th>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500 text-center">Active</th>
                <th className="px-6 py-4 font-mono-ui text-[10px] uppercase tracking-widest text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {agents.map(agent => (
                <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{agent.name}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-1">{agent.agent_key}</div>
                  </td>
                  <td className="px-6 py-4 text-neutral-300 capitalize">{agent.category || "Uncategorized"}</td>
                  <td className="px-6 py-4 text-neutral-400">{agent.provider}</td>
                  <td className="px-6 py-4">
                    {agent.requires_byok ? (
                      <span className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-xs">Yes</span>
                    ) : (
                      <span className="text-neutral-600">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Switch 
                      checked={agent.is_active} 
                      onCheckedChange={() => handleToggleActive(agent.id, agent.is_active)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Details
                    </Button>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    No agents found in the catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0b0b0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="bg-black border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-black border-white/10"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="bg-black border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
