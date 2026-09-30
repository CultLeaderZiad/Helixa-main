export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { assertFeature, limitPayload, PlanLimitError } from "@/lib/billing/enforce"
import { normalizeClientPrice } from "@/lib/billing/reseller"
import { isMissingTable } from "@/lib/flows/session"

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const supabase = await getSupabaseBypassClient()
  const agency = await supabase.from("agencies").select("id").eq("owner_account_id", session.user.id).maybeSingle()
  if (!agency.data) return NextResponse.json({ prices: [] })
  const prices = await supabase.from("client_workspace_prices").select("*").eq("agency_id", agency.data.id)
  if (prices.error) {
    if (isMissingTable(prices.error)) return NextResponse.json({ prices: [], migration_required: true })
    return NextResponse.json({ error: prices.error.message }, { status: 400 })
  }
  return NextResponse.json({ prices: prices.data || [] })
}

export async function PUT(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const supabase = await getSupabaseBypassClient()
  try {
    await assertFeature(supabase, session.user, "whiteLabel")
  } catch (error) {
    if (error instanceof PlanLimitError) return NextResponse.json(limitPayload(error), { status: 402 })
    throw error
  }
  const body = await request.json().catch(() => ({}))
  const price = normalizeClientPrice(body)
  if (!price.ok) return NextResponse.json({ error: price.error }, { status: 400 })
  const workspaceId = String(body.workspaceId || "")
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  const owned = await supabase.from("workspaces").select("id").eq("id", workspaceId).eq("owner_account_id", session.user.id).maybeSingle()
  if (!owned.data) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  const agency = await supabase.from("agencies").select("id").eq("owner_account_id", session.user.id).maybeSingle()
  if (!agency.data?.id) return NextResponse.json({ error: "Save agency branding before setting a client price." }, { status: 409 })
  const saved = await supabase.from("client_workspace_prices").upsert({
    agency_id: agency.data.id,
    workspace_id: workspaceId,
    amount_cents: price.price.amountCents,
    currency: price.price.currency,
    interval: price.price.interval,
    provider: price.price.provider,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" }).select("*").maybeSingle()
  if (saved.error) {
    if (isMissingTable(saved.error)) return NextResponse.json({ error: "Run the phase 7 migration first" }, { status: 503 })
    return NextResponse.json({ error: saved.error.message }, { status: 400 })
  }
  return NextResponse.json({ price: saved.data })
}
