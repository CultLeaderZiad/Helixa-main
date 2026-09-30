"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Loader2 } from "lucide-react"

export default function BroadcastsPage() {
  const { userId, isLoading } = useInstagramSession()
  const { data, mutate, isLoading: loading } = useSWR(userId ? "/api/broadcasts" : null, fetcher)
  const sequences = useSWR(userId ? "/api/sequences" : null, fetcher)
  const [form, setForm] = useState({
    name: "",
    channel: "instagram",
    tag: "",
    text: "",
    templateName: "",
    messageTag: "",
    perMinute: "30",
    scheduledAt: "",
  })
  const [notice, setNotice] = useState("")

  async function sendBroadcast() {
    const segment = form.tag ? { tags: [form.tag], tagMode: "any", channels: [form.channel] } : { all: true, channels: [form.channel] }
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        channel: form.channel,
        text: form.text,
        content: { message: form.text },
        templateName: form.templateName || null,
        messageTag: form.messageTag || null,
        perMinute: Number(form.perMinute) || 30,
        scheduledAt: form.scheduledAt || null,
        segment,
        send: true,
      }),
    })
    const body = await res.json()
    if (!res.ok) {
      setNotice(body.error || "Could not queue")
      return
    }
    setNotice(`Queued ${body.queued || 0}. Skipped ${body.skipped?.length || 0}.`)
    mutate()
  }

  async function createSequence() {
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || "Drip",
        channel: form.channel,
        enroll: true,
        segment: form.tag ? { tags: [form.tag], tagMode: "any" } : { all: true, channels: [form.channel] },
        steps: [
          { id: "s1", delayMs: 0, text: form.text || "First note", templateName: form.templateName || undefined },
          { id: "s2", delayMs: 24 * 60 * 60 * 1000, text: "A day later. Reply STOP to opt out." },
        ],
      }),
    })
    const body = await res.json()
    setNotice(res.ok ? `Sequence enrolled ${body.enrolled || 0}` : body.error || "Sequence failed")
    sequences.mutate()
  }

  if (isLoading || loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>

  const broadcasts = Array.isArray(data?.broadcasts) ? data.broadcasts : []
  const sequenceRows = Array.isArray(sequences.data?.sequences) ? sequences.data.sequences : []

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Broadcasts</h1>
        <p className="text-sm text-neutral-400 mt-1">WhatsApp uses an approved template and an opted-in contact. Instagram and Messenger send inside 24 hours, or through 7 days with the HUMAN_AGENT tag. Telegram and the website widget send freely. STOP opts a contact out.</p>
      </div>
      {data?.migration_required && <p className="text-sm text-amber-200">Run the phase 5 SQL migration first.</p>}
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs text-neutral-400">Name<input className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="text-xs text-neutral-400">Channel
          <select className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>
            <option value="instagram">Instagram</option>
            <option value="messenger">Messenger</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="webchat">Website chat</option>
          </select>
        </label>
        <label className="text-xs text-neutral-400">Tag segment<input className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.tag} placeholder="Empty = everyone on this channel" onChange={(event) => setForm({ ...form, tag: event.target.value })} /></label>
        <label className="text-xs text-neutral-400">Per minute<input className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.perMinute} onChange={(event) => setForm({ ...form, perMinute: event.target.value })} /></label>
        <label className="text-xs text-neutral-400 md:col-span-2">Message<textarea className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" rows={3} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} /></label>
        <label className="text-xs text-neutral-400">WhatsApp template<input className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.templateName} onChange={(event) => setForm({ ...form, templateName: event.target.value })} /></label>
        <label className="text-xs text-neutral-400">Message tag
          <select className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.messageTag} onChange={(event) => setForm({ ...form, messageTag: event.target.value })}>
            <option value="">Inside 24h only</option>
            <option value="HUMAN_AGENT">HUMAN_AGENT (7 days)</option>
          </select>
        </label>
        <label className="text-xs text-neutral-400 md:col-span-2">Schedule<input type="datetime-local" className="mt-1 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label>
      </div>
      <div className="flex gap-2">
        <button onClick={sendBroadcast} className="h-9 px-4 rounded-lg bg-[#e5a93c] text-black text-sm font-medium">Queue broadcast</button>
        <button onClick={createSequence} className="h-9 px-4 rounded-lg border border-white/10 text-sm text-white">Start 2-step drip</button>
        {notice && <span className="text-sm text-neutral-300 self-center">{notice}</span>}
      </div>
      <section className="space-y-2">
        <h2 className="text-sm text-neutral-300">Sent and scheduled</h2>
        {broadcasts.map((row: { id: string; name: string; channel: string; status: string; stats?: { queued?: number; skipped?: number } }) => (
          <a key={row.id} href={`/dashboard/broadcasts/${row.id}`} className="block rounded-xl border border-white/10 px-4 py-3 text-sm">
            <span className="text-white">{row.name}</span>
            <span className="text-neutral-500"> · {row.channel} · {row.status}</span>
          </a>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm text-neutral-300">Sequences</h2>
        {sequenceRows.map((row: { id: string; name: string; status: string; channel: string }) => (
          <div key={row.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-neutral-300">{row.name} · {row.channel} · {row.status}</div>
        ))}
      </section>
    </div>
  )
}
