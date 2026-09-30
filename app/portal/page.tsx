"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export default function PortalPage() {
  const overview = useSWR("/api/agency/overview", fetcher)
  const agency = useSWR("/api/agency", fetcher)
  const brand = agency.data?.agency
  const color = brand?.primary_color || "#e5a93c"
  const clients = overview.data?.clients || []
  return (
    <div className="min-h-screen bg-[#07080c] text-white p-6 md:p-10" style={{ ["--brand" as string]: color }}>
      <header className="flex items-center gap-3 mb-8">
        {brand?.logo_url ? <img src={brand.logo_url} alt="" className="h-8 w-auto" /> : null}
        <div>
          <div className="text-xl font-semibold">{brand?.app_name || "Client portal"}</div>
          <div className="text-sm text-neutral-400">{brand?.name || "Read-only numbers for this account"}</div>
        </div>
      </header>
      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl">
        {clients.map((client: { workspaceId: string; name: string; kpis: { conversations: number; newContacts: number; orders: number; revenueCents: number; aiReplies: number; handoffs: number } }) => (
          <article key={client.workspaceId} className="rounded-2xl border border-white/10 p-5 space-y-2">
            <h2 className="font-medium" style={{ color }}>{client.name}</h2>
            <p className="text-sm text-neutral-300">Conversations {client.kpis.conversations}</p>
            <p className="text-sm text-neutral-300">Contacts {client.kpis.newContacts}</p>
            <p className="text-sm text-neutral-300">Orders {client.kpis.orders}</p>
            <p className="text-sm text-neutral-300">Revenue (cents) {client.kpis.revenueCents}</p>
            <p className="text-sm text-neutral-300">AI replies {client.kpis.aiReplies} · handoffs {client.kpis.handoffs}</p>
          </article>
        ))}
        {clients.length === 0 && <p className="text-sm text-neutral-400">No client workspaces yet.</p>}
      </div>
    </div>
  )
}
