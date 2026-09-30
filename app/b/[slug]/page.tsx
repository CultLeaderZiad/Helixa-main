"use client"

import { useState, type FormEvent } from "react"
import { useParams } from "next/navigation"

export default function BioPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [form, setForm] = useState({ name: "", email: "", phone: "", optIn: true })
  const [done, setDone] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const res = await fetch(`/api/public/bio/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error || "Could not save")
      return
    }
    setDone("You are on the list.")
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-slate-900 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] text-[#b8860b]">Helixa</div>
        <h1 className="text-3xl font-semibold">Get the details</h1>
        <p className="text-sm text-slate-500">Leave an email or a phone number. We add you as a contact and can start a flow.</p>
        <input className="w-full h-11 px-3 rounded-xl border border-slate-200" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="w-full h-11 px-3 rounded-xl border border-slate-200" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className="w-full h-11 px-3 rounded-xl border border-slate-200" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.optIn} onChange={(event) => setForm({ ...form, optIn: event.target.checked })} />
          WhatsApp updates are ok
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {done && <p className="text-sm text-emerald-700">{done}</p>}
        <button className="w-full h-11 rounded-xl bg-slate-900 text-white">Continue</button>
      </form>
    </main>
  )
}
