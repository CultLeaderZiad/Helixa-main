"use client"

import { use } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export default function ShareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const report = useSWR(`/api/share/report/${token}`, fetcher)
  const kpis = report.data?.kpis
  if (report.isLoading) return <main className="min-h-screen bg-white text-slate-900 p-10">Loading report…</main>
  if (!kpis) return <main className="min-h-screen bg-white text-slate-900 p-10">This report is not available.</main>
  return (
    <main className="min-h-screen bg-white text-slate-900 p-8 md:p-12" dir="auto">
      <p className="text-xs uppercase tracking-widest text-slate-400">Helixa</p>
      <h1 className="text-3xl font-semibold mt-2">Client report</h1>
      <p className="text-slate-500 mt-1">{report.data.period}</p>
      <dl className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl">
        <Row label="Conversations" value={kpis.conversations} />
        <Row label="New contacts" value={kpis.newContacts} />
        <Row label="Orders" value={kpis.orders} />
        <Row label="Revenue (cents)" value={kpis.revenueCents} />
        <Row label="AI replies" value={kpis.aiReplies} />
        <Row label="Handoffs" value={kpis.handoffs} />
      </dl>
      <a className="inline-block mt-8 text-sm underline" href={`/api/share/report/${token}?format=pdf`}>Download PDF</a>
    </main>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
