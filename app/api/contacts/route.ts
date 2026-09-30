export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { contactFromRow, contactsToCsv, filterContacts } from "@/lib/contacts"
import { latestInboundAt, loadContact, saveContactTouch } from "@/lib/channels/store"
import { windowForAdapter } from "@/lib/channels/window"
import { getAdapter } from "@/lib/channels/adapters"

async function loadRows(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return { response: result.response }
  const userId = result.igUser?.id
  if (!userId) return { contacts: [], missing: false }
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(1000)
  if (error) {
    if (/schema cache|does not exist|Could not find the table/i.test(error.message || "")) {
      return { contacts: [], missing: true }
    }
    throw error
  }
  const contacts = (data || []).map(contactFromRow)
  const params = request.nextUrl.searchParams
  return {
    contacts: filterContacts(contacts, { query: params.get("q"), tag: params.get("tag") }),
    missing: false,
  }
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await loadRows(request)
    if ("response" in loaded && loaded.response) return loaded.response
    const externalId = request.nextUrl.searchParams.get("externalId")
    const channel = request.nextUrl.searchParams.get("channel")
    if (externalId && channel) {
      const contact = loaded.contacts.find((row) => row.external_id === externalId && row.channel === channel) || null
      const adapter = getAdapter(channel)
      let lastInbound = contact?.last_inbound_at || null
      const conversationId = request.nextUrl.searchParams.get("conversationId")
      if (!lastInbound && conversationId) {
        const supabase = await getSupabaseBypassClient()
        lastInbound = await latestInboundAt(supabase, conversationId, externalId)
      }
      const window = adapter ? windowForAdapter(adapter, lastInbound, Date.now()) : null
      return NextResponse.json({ contact, window })
    }
    return NextResponse.json({ contacts: loaded.contacts, migration_required: loaded.missing })
  } catch (error) {
    console.error("[contacts] GET", error)
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireSessionUser(request)
    if (result.response) return result.response
    const userId = result.igUser?.id
    if (!userId) return NextResponse.json({ error: "No workspace profile" }, { status: 400 })
    const body = await request.json()
    const channel = String(body.channel || "")
    const externalId = String(body.externalId || body.external_id || "")
    if (!channel || !externalId) return NextResponse.json({ error: "Missing contact" }, { status: 400 })
    const supabase = await getSupabaseBypassClient()
    const existing = await loadContact(supabase, userId, channel, externalId)
    const now = new Date().toISOString()
    const saved = await saveContactTouch(
      supabase,
      existing,
      {
        workspaceId: result.workspace?.id || result.igUser?.workspace_id || null,
        userId,
        channel,
        externalId,
        displayName: typeof body.displayName === "string" ? body.displayName : null,
        source: existing?.source || "manual",
        inboundAt: existing?.last_inbound_at || null,
      },
      now,
    )
    if (!saved?.id && !existing?.id) return NextResponse.json({ error: "Contacts are not available yet" }, { status: 503 })
    const id = saved?.id || existing?.id
    if ("bot_paused" in body && id) {
      const updated = await supabase.from("contacts").update({ bot_paused: Boolean(body.bot_paused) }).eq("id", id).eq("user_id", userId).select("*").maybeSingle()
      if (updated.data) return NextResponse.json({ contact: contactFromRow(updated.data) })
    }
    return NextResponse.json({ contact: saved })
  } catch (error) {
    console.error("[contacts] POST", error)
    return NextResponse.json({ error: "Failed to save contact" }, { status: 500 })
  }
}

export async function csvResponse(request: NextRequest) {
  const loaded = await loadRows(request)
  if ("response" in loaded && loaded.response) return loaded.response
  const csv = contactsToCsv(loaded.contacts)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=helixa-contacts.csv",
    },
  })
}
