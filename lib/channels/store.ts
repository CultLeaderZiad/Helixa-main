import { contactFromRow, mergeContactTouch, type ContactRecord, type ContactTouch } from "@/lib/contacts"
import { contentWithTrackedUrls, shouldTrackUrl, trackingCode, urlsInContent } from "@/lib/channels/links"
import type { Db, OutboundContent } from "@/lib/channels/types"
import { messageIsInbound } from "@/lib/analytics-metrics"

function missingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /schema cache|does not exist|Could not find the table|column/i.test(message)
  )
}

export async function loadContact(
  supabase: Db,
  userId: string | number,
  channel: string,
  externalId: string,
): Promise<ContactRecord | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle()
  if (error) {
    if (missingRelation(error)) return null
    console.warn("[contacts] load failed:", error.message)
    return null
  }
  return data ? contactFromRow(data) : null
}

export async function saveContactTouch(
  supabase: Db,
  existing: ContactRecord | null,
  touch: ContactTouch,
  nowIso: string,
): Promise<ContactRecord | null> {
  const next = mergeContactTouch(existing, touch, nowIso)
  const row = {
    workspace_id: next.workspace_id,
    user_id: next.user_id,
    channel: next.channel,
    external_id: next.external_id,
    display_name: next.display_name,
    username: next.username,
    tags: next.tags,
    custom_fields: next.custom_fields,
    source: next.source,
    source_automation_id: next.source_automation_id,
    first_seen_at: next.first_seen_at,
    last_seen_at: next.last_seen_at,
    last_inbound_at: next.last_inbound_at,
    bot_paused: next.bot_paused,
    email: next.email,
    phone: next.phone,
    updated_at: nowIso,
  }
  const saved = existing?.id
    ? await supabase.from("contacts").update(row).eq("id", existing.id).select("*").maybeSingle()
    : await supabase.from("contacts").insert(row).select("*").maybeSingle()
  if (saved.error) {
    if (!missingRelation(saved.error)) console.warn("[contacts] save failed:", saved.error.message)
    return existing
  }
  return saved.data ? contactFromRow(saved.data) : next
}

export async function insertMessage(supabase: Db, row: Record<string, unknown>): Promise<void> {
  const direction = row.direction === "in" ? "in" : "out"
  const payload: Record<string, unknown> = {
    ...row,
    direction,
    is_from_instagram: direction === "in",
  }
  let result = await supabase.from("messages").insert(payload)
  if (result.error && /direction/i.test(result.error.message || "")) {
    const { direction: _direction, ...rest } = payload
    result = await supabase.from("messages").insert(rest)
  }
  if (result.error && /platform/i.test(result.error.message || "")) {
    const { platform: _platform, direction: _direction, ...rest } = payload
    result = await supabase.from("messages").insert(rest)
  }
  if (result.error && !/duplicate|already exists|23505/i.test(result.error.message || "")) {
    console.warn("[messages] insert failed:", result.error.message)
  }
}

export async function commentAlreadyHandled(supabase: Db, commentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("automation_events")
    .select("id")
    .eq("comment_id", commentId)
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

export async function logAutomationEvent(supabase: Db, row: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("automation_events").insert(row)
  if (error) console.warn("[automation_events] insert failed:", error.message)
}

export interface ConversationRef {
  id: string
  recipient_username?: string | null
}

export async function ensureConversation(
  supabase: Db,
  input: {
    userId: string | number
    recipientId: string
    username: string
    platform: string
    workspaceId?: string | null
  },
): Promise<ConversationRef | null> {
  let query = supabase
    .from("conversations")
    .select("id, recipient_username")
    .eq("user_id", input.userId)
    .eq("recipient_id", input.recipientId)
  if (input.platform !== "instagram") query = query.eq("platform", input.platform)
  const { data: existing } = await query.maybeSingle()
  const now = new Date().toISOString()
  if (existing?.id) {
    await supabase.from("conversations").update({ last_message_at: now, recipient_username: input.username || existing.recipient_username }).eq("id", existing.id)
    return existing
  }
  const inserted = await supabase
    .from("conversations")
    .insert({
      user_id: input.userId,
      recipient_id: input.recipientId,
      recipient_username: input.username,
      platform: input.platform,
      workspace_id: input.workspaceId || null,
      last_message_at: now,
    })
    .select("id, recipient_username")
    .maybeSingle()
  if (inserted.error && /platform|workspace_id/i.test(inserted.error.message || "")) {
    const retry = await supabase
      .from("conversations")
      .insert({
        user_id: input.userId,
        recipient_id: input.recipientId,
        recipient_username: input.username,
        last_message_at: now,
      })
      .select("id, recipient_username")
      .maybeSingle()
    return retry.data || null
  }
  return inserted.data || null
}

export async function latestInboundAt(
  supabase: Db,
  conversationId: string,
  recipientId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("created_at, direction, is_from_instagram, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(40)
  if (error || !Array.isArray(data)) return null
  const inbound = data.find((row: any) => messageIsInbound(row, recipientId))
  return inbound?.created_at || null
}

export function appOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export async function attachTrackedLinks(
  supabase: Db,
  content: OutboundContent,
  meta: {
    userId: string | number
    workspaceId?: string | null
    channel: string
    contactExternalId?: string | null
    automationId?: string | null
    variantId?: string | null
  },
): Promise<OutboundContent> {
  const origin = appOrigin()
  if (!origin) return content
  const urls = urlsInContent(content).filter((url) => shouldTrackUrl(url, origin))
  if (urls.length === 0) return content
  const map = new Map<string, string>()
  for (const destination of urls) {
    const code = trackingCode()
    const inserted = await supabase
      .from("tracked_links")
      .insert({
        code,
        workspace_id: meta.workspaceId || null,
        user_id: meta.userId,
        automation_id: meta.automationId || null,
        variant_id: meta.variantId || null,
        channel: meta.channel,
        contact_external_id: meta.contactExternalId || null,
        destination_url: destination,
      })
      .select("code")
      .maybeSingle()
    if (inserted.error || !inserted.data?.code) continue
    map.set(destination, `${origin}/r/${inserted.data.code}`)
  }
  return contentWithTrackedUrls(content, map)
}
