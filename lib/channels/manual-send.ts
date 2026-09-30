import { getAdapter } from "@/lib/channels/adapters"
import { latestInboundAt, insertMessage, loadContact } from "@/lib/channels/store"
import { windowForAdapter, type WindowVerdict } from "@/lib/channels/window"
import type { Db } from "@/lib/channels/types"
import { openAccessToken } from "@/lib/token-crypto"
import { isMetaAuthError, markInstagramReconnect } from "@/lib/instagram-token"
import { pickPageConnection } from "@/lib/channel-ids"

export interface HumanSendInput {
  userId: string | number
  workspaceId?: string | null
  channel: string
  recipientId: string
  conversationId?: string | null
  text: string
  username?: string | null
}

export type HumanSendResult =
  | { ok: true; window: WindowVerdict; id?: string }
  | { ok: false; status: number; error: string; window?: WindowVerdict; reconnect?: boolean }

async function credentials(
  supabase: Db,
  input: HumanSendInput,
): Promise<{ token: string; senderRef?: string; senderId?: string; senderName?: string } | null> {
  if (input.channel === "instagram" || !input.channel) {
    const { data } = await supabase
      .from("users")
      .select("access_token, business_account_id, username")
      .eq("id", input.userId)
      .maybeSingle()
    const token = openAccessToken(data?.access_token)
    if (!token) return null
    return { token, senderId: data?.business_account_id, senderName: data?.username }
  }

  const platform = input.channel === "messenger" || input.channel === "facebook" ? ["facebook", "messenger"] : [input.channel]
  const { data } = await supabase
    .from("platform_connections")
    .select("platform, access_token, page_id, external_account_id")
    .eq("user_id", input.userId)
    .in("platform", platform)
    .limit(5)
  const row = input.channel === "messenger" || input.channel === "facebook" ? pickPageConnection(data) : data?.[0]
  const token = openAccessToken(row?.access_token)
  if (!token || !row) return null
  return {
    token,
    senderRef: input.channel === "whatsapp" ? row.page_id : undefined,
    senderId: row.page_id || row.external_account_id,
    senderName: input.username || input.channel,
  }
}

export async function sendHumanMessage(supabase: Db, input: HumanSendInput): Promise<HumanSendResult> {
  const channel = input.channel || "instagram"
  const adapter = getAdapter(channel)
  if (!adapter) return { ok: false, status: 400, error: "This channel cannot send yet." }
  const creds = await credentials(supabase, input)
  if (!creds) return { ok: false, status: 400, error: "That channel is not connected." }

  const contact = await loadContact(supabase, input.userId, channel === "facebook" ? "messenger" : channel, input.recipientId)
  let lastInbound = contact?.last_inbound_at || null
  if (!lastInbound && input.conversationId) {
    lastInbound = await latestInboundAt(supabase, input.conversationId, input.recipientId)
  }
  const window = windowForAdapter(adapter, lastInbound, Date.now())
  if (window.status === "closed") {
    return {
      ok: false,
      status: 409,
      error: window.reason === "no_inbound"
        ? "This contact has not messaged you yet, so the messaging window is closed."
        : "The 24-hour messaging window is closed. Wait for the contact to message again.",
      window,
    }
  }

  const result = await adapter.sendText(
    {
      accessToken: creds.token,
      recipientId: input.recipientId,
      senderRef: creds.senderRef,
      messagingType: window.messagingType,
      tag: window.tag,
    },
    input.text,
  )
  if (!result.ok) {
    if (channel === "instagram" && isMetaAuthError({ code: result.code })) {
      await markInstagramReconnect(supabase, input.userId)
      return { ok: false, status: 401, error: "Instagram needs to be reconnected.", reconnect: true, window }
    }
    if (result.outsideWindow) {
      return { ok: false, status: 409, error: "The messaging window is closed.", window: { ...window, status: "closed", flagged: true, reason: "outside_window" } }
    }
    return { ok: false, status: 502, error: result.error || "Send failed", window }
  }

  if (input.conversationId) {
    await insertMessage(supabase, {
      id: `${channel}_human_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      conversation_id: input.conversationId,
      user_id: input.userId,
      sender_id: creds.senderId || input.userId,
      sender_username: creds.senderName || "You",
      content: input.text,
      direction: "out",
      platform: channel,
    })
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", input.conversationId)
  }

  return { ok: true, window, id: result.id }
}
