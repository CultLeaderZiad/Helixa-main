"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export default function IntegrationsPage() {
  const hooks = useSWR("/api/integrations/webhooks", fetcher)
  const keys = useSWR("/api/integrations/keys", fetcher)
  const [url, setUrl] = useState("https://example.com/helixa")
  const [secret, setSecret] = useState("")
  const [token, setToken] = useState("")
  const [sheet, setSheet] = useState("")
  const [sheetToken, setSheetToken] = useState("")
  const [hubspot, setHubspot] = useState("")
  const [paymobKey, setPaymobKey] = useState("")
  const [paymobHmac, setPaymobHmac] = useState("")
  const [integrationId, setIntegrationId] = useState("")
  const [iframeId, setIframeId] = useState("")
  const [stripeKey, setStripeKey] = useState("")
  const [stripeWebhook, setStripeWebhook] = useState("")
  const [note, setNote] = useState("")

  async function addHook() {
    const response = await fetch("/api/integrations/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: ["contact.created", "lead.qualified", "order.created", "order.updated", "tag.added"] }),
    })
    const json = await response.json()
    setSecret(response.ok ? json.secret : "")
    setNote(response.ok ? "Webhook saved. Copy the secret now." : json.error || "Failed")
    hooks.mutate()
  }

  async function addKey() {
    const response = await fetch("/api/integrations/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "n8n" }) })
    const json = await response.json()
    setToken(response.ok ? json.token : "")
    setNote(response.ok ? "API key created. Copy it now." : json.error || "Failed")
    keys.mutate()
  }

  async function saveSheets() {
    const response = await fetch("/api/integrations/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spreadsheetId: sheet, accessToken: sheetToken, export: true }),
    })
    const json = await response.json()
    setNote(response.ok ? `Exported ${json.updated ?? ""} rows` : json.error || "Sheets failed")
  }

  async function saveHubspot() {
    const response = await fetch("/api/integrations/hubspot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: hubspot, sync: true }),
    })
    const json = await response.json()
    setNote(response.ok ? `Synced ${json.synced}` : json.error || "HubSpot failed")
  }

  async function savePaymob() {
    const response = await fetch("/api/integrations/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "paymob", apiKey: paymobKey, hmac: paymobHmac, integrationId, iframeId }),
    })
    const json = await response.json()
    setNote(response.ok ? "Paymob saved" : json.error || "Failed")
  }

  async function saveStripe() {
    const response = await fetch("/api/integrations/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "stripe", secretKey: stripeKey, webhookSecret: stripeWebhook }),
    })
    const json = await response.json()
    setNote(response.ok ? "Stripe saved" : json.error || "Failed")
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="text-sm text-neutral-400 mt-1">Outgoing events are signed and retried. Incoming calls use a workspace API key.</p>
      </div>
      {note && <p className="text-sm text-neutral-300">{note}</p>}
      {secret && <p className="text-xs break-all text-amber-200">Signing secret: {secret}</p>}
      {token && <p className="text-xs break-all text-amber-200">API key: {token}</p>}
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">Outgoing webhook</h2>
        <input className={field} value={url} onChange={(event) => setUrl(event.target.value)} />
        <button type="button" className={button} onClick={addHook}>Add endpoint</button>
        <ul className="text-xs text-neutral-400">{(hooks.data?.endpoints || []).map((hook: { id: string; url: string }) => <li key={hook.id}>{hook.url}</li>)}</ul>
      </section>
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">API key for n8n, Zapier, or Make</h2>
        <p className="text-xs text-neutral-500">POST /api/v1/contacts with Authorization: Bearer hx_live_…</p>
        <button type="button" className={button} onClick={addKey}>Create key</button>
        <ul className="text-xs text-neutral-400">{(keys.data?.keys || []).map((key: { id: string; prefix: string; name: string }) => <li key={key.id}>{key.name} · {key.prefix}…</li>)}</ul>
      </section>
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">Google Sheets</h2>
        <input className={field} placeholder="Spreadsheet id" value={sheet} onChange={(event) => setSheet(event.target.value)} />
        <input className={field} placeholder="OAuth access token" value={sheetToken} onChange={(event) => setSheetToken(event.target.value)} />
        <button type="button" className={button} onClick={saveSheets}>Save and export leads</button>
      </section>
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">HubSpot</h2>
        <input className={field} placeholder="Private app token" value={hubspot} onChange={(event) => setHubspot(event.target.value)} />
        <button type="button" className={button} onClick={saveHubspot}>Save and sync contacts</button>
      </section>
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">Paymob</h2>
        <input className={field} placeholder="API key" value={paymobKey} onChange={(event) => setPaymobKey(event.target.value)} />
        <input className={field} placeholder="HMAC secret" value={paymobHmac} onChange={(event) => setPaymobHmac(event.target.value)} />
        <input className={field} placeholder="Integration id" value={integrationId} onChange={(event) => setIntegrationId(event.target.value)} />
        <input className={field} placeholder="Iframe id" value={iframeId} onChange={(event) => setIframeId(event.target.value)} />
        <button type="button" className={button} onClick={savePaymob}>Save Paymob</button>
      </section>
      <section className="border border-white/10 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm text-white">Stripe</h2>
        <input className={field} placeholder="Secret key" value={stripeKey} onChange={(event) => setStripeKey(event.target.value)} />
        <input className={field} placeholder="Webhook secret" value={stripeWebhook} onChange={(event) => setStripeWebhook(event.target.value)} />
        <button type="button" className={button} onClick={saveStripe}>Save Stripe</button>
      </section>
    </div>
  )
}

const field = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
const button = "text-sm px-3 py-2 rounded-lg bg-white text-black font-medium"
