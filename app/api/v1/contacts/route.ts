export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceFromApiKey } from "@/lib/integrations/api-auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { emitIntegrationEvent } from "@/lib/integrations/dispatch"

export async function GET(request: NextRequest) {
  const auth = await workspaceFromApiKey(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase.from("contacts").select("id, channel, external_id, display_name, email, phone, tags, custom_fields, first_seen_at").eq("user_id", auth.userId).order("last_seen_at", { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ contacts: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await workspaceFromApiKey(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const externalId = String(body.externalId || body.external_id || "").trim()
  const channel = String(body.channel || "api").slice(0, 40)
  if (!externalId) return NextResponse.json({ error: "externalId is required" }, { status: 400 })
  const supabase = await getSupabaseBypassClient()
  const now = new Date().toISOString()
  const row = {
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    channel,
    external_id: externalId,
    display_name: body.name || null,
    email: body.email || null,
    phone: body.phone || null,
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : [],
    custom_fields: body.fields && typeof body.fields === "object" ? body.fields : {},
    source: "api",
    first_seen_at: now,
    last_seen_at: now,
  }
  const saved = await supabase.from("contacts").upsert(row, { onConflict: "user_id,channel,external_id" }).select("id").maybeSingle()
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
  await emitIntegrationEvent(supabase, {
    workspaceId: auth.workspaceId,
    userId: auth.userId,
    type: body.lead ? "lead.qualified" : "contact.created",
    data: { contactId: saved.data?.id, externalId, channel, email: body.email || null },
  })
  return NextResponse.json({ id: saved.data?.id })
}
