"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { toast } from "sonner"

interface TikTokAccount {
  id: string
  pageId: string
  username: string | null
  region: string | null
  welcome: string
  defaultReply: string
  suggestedQuestions: string[]
  dmAllowed: boolean
  dmReason: string
  commentToMessage: boolean
}

export default function TikTokDmSettings() {
  const { data, mutate } = useSWR("/api/tiktok/settings", fetcher)
  const accounts = (data?.accounts || []) as TikTokAccount[]
  const [pageId, setPageId] = useState("")
  const selected = accounts.find((account) => account.pageId === (pageId || accounts[0]?.pageId)) || null
  const [welcome, setWelcome] = useState("")
  const [defaultReply, setDefaultReply] = useState("")
  const [questions, setQuestions] = useState("")
  const [region, setRegion] = useState("")
  const [readyFor, setReadyFor] = useState("")

  useEffect(() => {
    if (!selected || readyFor === selected.pageId) return
    setReadyFor(selected.pageId)
    setWelcome(selected.welcome || "")
    setDefaultReply(selected.defaultReply || "")
    setQuestions((selected.suggestedQuestions || []).join("\n"))
    setRegion(selected.region || "")
  }, [selected, readyFor])

  if (!accounts.length) return null

  async function save() {
    if (!selected) return
    const response = await fetch("/api/tiktok/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: selected.pageId,
        region,
        welcome,
        defaultReply,
        suggestedQuestions: questions.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 3),
      }),
    })
    if (!response.ok) {
      toast.error("Could not save TikTok settings")
      return
    }
    toast.success("TikTok settings saved")
    await mutate()
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-white">TikTok DM settings</p>
      <p className="text-xs text-neutral-400 leading-relaxed">
        {selected?.dmAllowed
          ? "DMs are available for this account."
          : "DMs are hidden for this sign-up region."}
        {selected?.commentToMessage
          ? " Comment-to-Message is on because the account is registered in Vietnam, Indonesia, or Thailand."
          : " Comment-to-Message stays off until the stored region is VN, ID, or TH."}
      </p>
      {accounts.length > 1 && (
        <select className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white" value={selected?.pageId || ""} onChange={(event) => setPageId(event.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.pageId}>{account.username || account.pageId}</option>
          ))}
        </select>
      )}
      <input className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="Sign-up region, for example EG or VN" value={region} onChange={(event) => setRegion(event.target.value)} />
      <textarea className="min-h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Welcome message" value={welcome} onChange={(event) => setWelcome(event.target.value)} />
      <textarea className="min-h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Suggested questions, one per line (max 3)" value={questions} onChange={(event) => setQuestions(event.target.value)} />
      <textarea className="min-h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Default reply when no keyword matches" value={defaultReply} onChange={(event) => setDefaultReply(event.target.value)} />
      <button type="button" onClick={save} className="h-9 rounded-lg bg-white px-3 text-sm text-black">Save TikTok settings</button>
    </div>
  )
}
