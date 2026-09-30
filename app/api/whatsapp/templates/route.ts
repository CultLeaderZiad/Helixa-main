export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { forbidBelow, requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { openAccessToken } from "@/lib/token-crypto"
import { insertMessage } from "@/lib/channels/store"
import { listWhatsAppTemplates, sendWhatsAppTemplate, bodyParameterCount } from "@/lib/whatsapp/templates"

/**
 * GET syncs approved templates from the WABA into whatsapp_templates.
 * POST sends one approved template. This is the send that works after the
 * 24-hour customer-care window.
 */
export async function GET(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  if (!result.igUser?.id) return NextResponse.json({ templates: [] })
  const supabase = await getSupabaseBypassClient()
  const userId = result.igUser.id
  const phoneNumberId = request.nextUrl.searchParams.get("phoneNumberId")
  const shouldSync = request.nextUrl.searchParams.get("sync") === "1"
  if (shouldSync) {
    const denied = forbidBelow(result.user.workspace_role, "admin")
    if (denied) return denied
    const synced = await syncTemplates(supabase, userId)
    if (!synced.ok) return NextResponse.json({ error: synced.error }, { status: synced.status })
  }
  let query = supabase.from("whatsapp_templates").select("name, language, status, category, components, phone_number_id, waba_id").eq("user_id", userId)
  if (phoneNumberId) query = query.eq("phone_number_id", phoneNumberId)
  const { data, error } = await query
  if (error) {
    if (/whatsapp_templates/i.test(error.message || "")) {
      return NextResponse.json({ error: "Run the phase 4 migration before syncing templates.", templates: [] }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not load templates" }, { status: 500 })
  }
  const templates = (data || []).map((row: any) => ({
    ...row,
    body_parameters: bodyParameterCount(row.components),
  }))
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const denied = forbidBelow(result.user.workspace_role, "member")
  if (denied) return denied
  if (!result.igUser?.id) return NextResponse.json({ error: "WhatsApp conversation not found" }, { status: 404 })

  let body: { conversationId?: string; name?: string; language?: string; parameters?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.conversationId || !body.name || !body.language) {
    return NextResponse.json({ error: "conversationId, name, and language are required" }, { status: 400 })
  }

  const supabase = await getSupabaseBypassClient()
  const userId = result.igUser.id
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, platform, recipient_id, user_id, channel_account_id")
    .eq("id", body.conversationId)
    .eq("user_id", userId)
    .maybeSingle()
  if (conversationError && /channel_account_id/i.test(conversationError.message || "")) {
    return NextResponse.json({ error: "Run the phase 4 migration so each conversation remembers its WhatsApp number." }, { status: 503 })
  }
  if (!conversation || conversation.platform !== "whatsapp") {
    return NextResponse.json({ error: "WhatsApp conversation not found" }, { status: 404 })
  }

  const phoneNumberId = conversation.channel_account_id
  if (!phoneNumberId) {
    return NextResponse.json({ error: "This conversation is not tied to a WhatsApp number." }, { status: 409 })
  }
  const { data: connection } = await supabase
    .from("platform_connections")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("platform", "whatsapp")
    .eq("page_id", phoneNumberId)
    .maybeSingle()
  const token = openAccessToken(connection?.access_token)
  if (!token) return NextResponse.json({ error: "That WhatsApp number is not connected." }, { status: 400 })

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("name, language, status, components")
    .eq("user_id", userId)
    .eq("phone_number_id", phoneNumberId)
    .eq("name", body.name)
    .eq("language", body.language)
    .maybeSingle()
  if (!template || String(template.status).toUpperCase() !== "APPROVED") {
    return NextResponse.json({ error: "That template is not an approved template for this number. Sync templates first." }, { status: 400 })
  }
  const needed = bodyParameterCount(template.components)
  const parameters = (body.parameters || []).map((value) => String(value))
  if (parameters.length < needed) {
    return NextResponse.json({ error: `This template needs ${needed} body parameter${needed === 1 ? "" : "s"}.` }, { status: 400 })
  }

  const sent = await sendWhatsAppTemplate(fetch, {
    phoneNumberId,
    accessToken: token,
    to: String(conversation.recipient_id),
    name: body.name,
    language: body.language,
    bodyParameters: parameters.slice(0, needed || parameters.length),
  })
  if (!sent.ok) return NextResponse.json({ error: sent.error || "Template was not sent" }, { status: 502 })

  const preview = `[template] ${body.name}`
  await insertMessage(supabase, {
    id: `whatsapp_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: conversation.id,
    user_id: userId,
    sender_id: phoneNumberId,
    sender_username: "You",
    content: preview,
    direction: "out",
    platform: "whatsapp",
  })
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation.id)
  return NextResponse.json({ success: true, id: sent.id })
}

async function syncTemplates(supabase: any, userId: string | number): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: connections, error } = await supabase
    .from("platform_connections")
    .select("page_id, access_token, metadata")
    .eq("user_id", userId)
    .eq("platform", "whatsapp")
  if (error) return { ok: false, error: "Could not load WhatsApp numbers", status: 500 }
  if (!connections?.length) return { ok: false, error: "Connect a WhatsApp number first", status: 400 }
  for (const connection of connections) {
    const token = openAccessToken(connection.access_token)
    const wabaId = connection.metadata?.waba_id
    if (!token || !wabaId) continue
    const listed = await listWhatsAppTemplates(fetch, String(wabaId), token)
    if (!listed.ok) return { ok: false, error: listed.error, status: 502 }
    for (const template of listed.templates) {
      const row = {
        user_id: userId,
        phone_number_id: connection.page_id,
        waba_id: String(wabaId),
        name: template.name,
        language: template.language,
        status: template.status,
        category: template.category,
        components: template.components,
        synced_at: new Date().toISOString(),
      }
      const { data: existing } = await supabase
        .from("whatsapp_templates")
        .select("id")
        .eq("user_id", userId)
        .eq("phone_number_id", connection.page_id)
        .eq("name", template.name)
        .eq("language", template.language)
        .maybeSingle()
      const write = existing
        ? await supabase.from("whatsapp_templates").update(row).eq("id", existing.id)
        : await supabase.from("whatsapp_templates").insert(row)
      if (write.error) {
        if (/whatsapp_templates/i.test(write.error.message || "")) {
          return { ok: false, error: "Run the phase 4 migration before syncing templates.", status: 503 }
        }
        return { ok: false, error: write.error.message || "Could not save templates", status: 500 }
      }
    }
  }
  return { ok: true }
}
