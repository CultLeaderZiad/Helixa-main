"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Loader2 } from "lucide-react"

export default function FlowsPage() {
  const { userId, isLoading } = useInstagramSession()
  const { data, mutate, isLoading: loading } = useSWR(userId ? "/api/flows" : null, fetcher)
  const [name, setName] = useState("New flow")
  const [busy, setBusy] = useState(false)
  const flows = Array.isArray(data?.flows) ? data.flows : []

  async function createFlow() {
    setBusy(true)
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, channel: "instagram" }),
    })
    const body = await res.json()
    setBusy(false)
    if (body.id) window.location.href = `/dashboard/flows/${body.id}`
  }

  async function migrate() {
    setBusy(true)
    await fetch("/api/flows/migrate", { method: "POST" })
    setBusy(false)
    mutate()
  }

  if (isLoading || loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Flows</h1>
          <p className="text-sm text-neutral-400 mt-1">Versioned graphs. Live flows run on the event queue, one contact at a time.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={migrate} disabled={busy} className="h-9 px-3 rounded-lg border border-white/10 text-sm text-neutral-200">Import automations</button>
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm" />
          <button onClick={createFlow} disabled={busy} className="h-9 px-3 rounded-lg bg-[#e5a93c] text-black text-sm font-medium">New flow</button>
        </div>
      </div>
      {data?.migration_required && <p className="text-sm text-amber-200">Run the phase 5 SQL migration before saving flows.</p>}
      <div className="grid gap-3">
        {flows.length === 0 && <p className="text-sm text-neutral-500">No flows yet. Import the single-step automations or start a blank canvas.</p>}
        {flows.map((flow: { id: string; name: string; status: string; channel: string; source_automation_id?: string | null }) => (
          <a key={flow.id} href={`/dashboard/flows/${flow.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.05]">
            <div>
              <div className="text-white text-sm font-medium">{flow.name}</div>
              <div className="text-xs text-neutral-500 mt-1">{flow.channel} {flow.source_automation_id ? "· from an automation" : ""}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${flow.status === "live" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-400"}`}>{flow.status}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
