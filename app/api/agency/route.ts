export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { sanitizeBrand } from "@/lib/agency/tenant"
import { isMissingTable } from "@/lib/flows/session"
import { assertFeature, limitPayload, PlanLimitError } from "@/lib/billing/enforce"

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase.from("agencies").select("*").eq("owner_account_id", session.user.id).maybeSingle()
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ agency: null, migration_required: true })
    return NextResponse.json({ error: "Failed to load agency" }, { status: 500 })
  }
  return NextResponse.json({ agency: data })
}

export async function PUT(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  if (session.user.workspace_role && session.user.workspace_role !== "owner" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Only the workspace owner can change branding" }, { status: 403 })
  }
  const supabase = await getSupabaseBypassClient()
  try {
    await assertFeature(supabase, session.user, "whiteLabel")
  } catch (error) {
    if (error instanceof PlanLimitError) return NextResponse.json(limitPayload(error), { status: 402 })
    throw error
  }
  const body = await request.json().catch(() => ({}))
  const brand = sanitizeBrand(body)
  if (!brand.ok) return NextResponse.json({ error: brand.error }, { status: 400 })
  const existing = await supabase.from("agencies").select("id").eq("owner_account_id", session.user.id).maybeSingle()
  if (existing.error && isMissingTable(existing.error)) {
    return NextResponse.json({ error: "Run the phase 6 migration first" }, { status: 503 })
  }
  const row = {
    owner_account_id: session.user.id,
    name: brand.value.name,
    app_name: brand.value.appName,
    logo_url: brand.value.logoUrl,
    primary_color: brand.value.primaryColor,
    accent_color: brand.value.accentColor,
    custom_domain: brand.value.customDomain,
    updated_at: new Date().toISOString(),
  }
  const saved = existing.data?.id
    ? await supabase.from("agencies").update(row).eq("id", existing.data.id).select("*").maybeSingle()
    : await supabase.from("agencies").insert(row).select("*").maybeSingle()
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
  if (saved.data?.id && session.workspace?.id) {
    await supabase.from("workspaces").update({ agency_id: saved.data.id }).eq("id", session.workspace.id)
  }
  return NextResponse.json({ agency: saved.data })
}
