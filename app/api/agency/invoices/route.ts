export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { paymentLinkForUser } from "@/lib/commerce/checkout"
import { recordPaymentIntent } from "@/lib/commerce/intents"
import { invoiceForPrice, normalizeClientPrice } from "@/lib/billing/reseller"
import { isMissingTable } from "@/lib/flows/session"

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const workspaceId = String(body.workspaceId || "")
  const supabase = await getSupabaseBypassClient()
  const stored = await supabase.from("client_workspace_prices").select("*").eq("workspace_id", workspaceId).eq("active", true).maybeSingle()
  if (stored.error) {
    if (isMissingTable(stored.error)) return NextResponse.json({ error: "Run the phase 7 migration first" }, { status: 503 })
    return NextResponse.json({ error: stored.error.message }, { status: 400 })
  }
  const price = stored.data
    ? normalizeClientPrice({
        amountCents: stored.data.amount_cents,
        currency: stored.data.currency,
        interval: stored.data.interval,
        provider: stored.data.provider,
      })
    : normalizeClientPrice(body)
  if (!price.ok) return NextResponse.json({ error: price.error }, { status: 400 })
  const agency = await supabase.from("agencies").select("id").eq("owner_account_id", session.user.id).maybeSingle()
  if (!agency.data?.id) return NextResponse.json({ error: "Agency branding is required" }, { status: 409 })
  const draft = invoiceForPrice(price.price, Date.now())
  const inserted = await supabase.from("client_invoices").insert({
    agency_id: agency.data.id,
    workspace_id: workspaceId,
    user_id: session.igUser?.id || null,
    amount_cents: draft.amountCents,
    currency: draft.currency,
    provider: draft.provider,
    status: "open",
    period_start: draft.periodStart,
    period_end: draft.periodEnd,
    due_at: draft.dueAt,
  }).select("id").maybeSingle()
  if (inserted.error || !inserted.data?.id) {
    return NextResponse.json({ error: inserted.error?.message || "Could not create the invoice" }, { status: 400 })
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  if (!session.igUser?.id) {
    return NextResponse.json({ invoiceId: inserted.data.id, url: null, error: "Connect a channel before charging a client." }, { status: 409 })
  }
  try {
    const link = await paymentLinkForUser(supabase, session.igUser.id, {
      amountCents: draft.amountCents,
      currency: draft.currency,
      description: `Client workspace ${workspaceId}`,
      orderId: inserted.data.id,
      successUrl: `${origin}/dashboard/agency?invoice=${inserted.data.id}`,
      cancelUrl: `${origin}/dashboard/agency?invoice=cancelled`,
    }, undefined, price.price.provider)
    if (!link) return NextResponse.json({ invoiceId: inserted.data.id, url: null, error: "Save a Paymob, Stripe, or Tap key under Integrations." }, { status: 409 })
    await supabase.from("client_invoices").update({ checkout_url: link.url, provider_reference: link.reference, provider: link.provider }).eq("id", inserted.data.id)
    // Bind the provider's signed id to the invoice so the callback trusts the
    // stored intent, not body metadata.
    await recordPaymentIntent(supabase, {
      accountId: session.user.id,
      invoiceId: inserted.data.id,
      provider: link.provider,
      providerOrderId: link.reference,
      amountMinor: draft.amountCents,
      currency: draft.currency,
    })
    return NextResponse.json({ invoiceId: inserted.data.id, url: link.url, provider: link.provider })
  } catch (error) {
    return NextResponse.json({ invoiceId: inserted.data.id, error: error instanceof Error ? error.message : "Payment link failed" }, { status: 502 })
  }
}
