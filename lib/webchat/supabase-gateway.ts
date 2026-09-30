import { ensureConversation, insertMessage } from "@/lib/channels/store"
import type { Db } from "@/lib/channels/types"
import type { RateBucket } from "@/lib/event-pipeline"
import type { WebchatGateway, WebchatMessage, WebchatWidget } from "@/lib/webchat/service"

function asWidget(row: any): WebchatWidget | null {
  if (!row?.id || !row.public_key) return null
  return {
    id: String(row.id),
    user_id: row.user_id,
    workspace_id: row.workspace_id || null,
    public_key: String(row.public_key),
    name: String(row.name || "Chat"),
    greeting: row.greeting ? String(row.greeting) : null,
    color: String(row.color || "#111111"),
    locale: String(row.locale || "en"),
    allowed_domains: Array.isArray(row.allowed_domains) ? row.allowed_domains.map(String) : [],
    enabled: row.enabled !== false,
  }
}

export function createSupabaseWebchatGateway(supabase: Db): WebchatGateway {
  return {
    async widgetByKey(publicKey) {
      const { data, error } = await supabase
        .from("webchat_widgets")
        .select("id, user_id, workspace_id, public_key, name, greeting, color, locale, allowed_domains, enabled")
        .eq("public_key", publicKey)
        .maybeSingle()
      if (error) return null
      return asWidget(data)
    },
    async visitor(widgetId, visitorId) {
      const { data } = await supabase
        .from("webchat_visitors")
        .select("secret_hash")
        .eq("widget_id", widgetId)
        .eq("visitor_id", visitorId)
        .maybeSingle()
      if (!data?.secret_hash) return null
      return { secret_hash: String(data.secret_hash) }
    },
    async createVisitor(input) {
      await supabase.from("webchat_visitors").insert({
        widget_id: input.widgetId,
        visitor_id: input.visitorId,
        secret_hash: input.secretHash,
      })
    },
    async rate(key) {
      const { data } = await supabase
        .from("webchat_rate_buckets")
        .select("window_start, count")
        .eq("bucket_key", key)
        .maybeSingle()
      if (!data?.window_start) return null
      const windowStart = Date.parse(data.window_start)
      if (!Number.isFinite(windowStart)) return null
      return { windowStart, count: Number(data.count) || 0 }
    },
    async saveRate(key, bucket: RateBucket) {
      const row = {
        bucket_key: key,
        window_start: new Date(bucket.windowStart).toISOString(),
        count: bucket.count,
        updated_at: new Date().toISOString(),
      }
      const existing = await supabase.from("webchat_rate_buckets").select("bucket_key").eq("bucket_key", key).maybeSingle()
      if (existing.data) {
        await supabase.from("webchat_rate_buckets").update(row).eq("bucket_key", key)
      } else {
        await supabase.from("webchat_rate_buckets").insert(row)
      }
    },
    async messages(widget, visitorId) {
      let query = supabase
        .from("conversations")
        .select("id")
        .eq("user_id", widget.user_id)
        .eq("recipient_id", visitorId)
        .eq("platform", "webchat")
      query = query.eq("channel_account_id", widget.public_key)
      const { data: conversation, error } = await query.maybeSingle()
      if (error || !conversation?.id) return []
      const { data } = await supabase
        .from("messages")
        .select("id, content, direction, is_from_instagram, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(50)
      return (data || []).map((row: any): WebchatMessage => ({
        id: String(row.id),
        content: String(row.content || ""),
        direction: row.direction === "in" || row.direction === "out"
          ? row.direction
          : row.is_from_instagram ? "in" : "out",
        created_at: String(row.created_at || new Date().toISOString()),
      }))
    },
    async acceptInbound(widget, visitorId, text, messageId, displayName) {
      const conversation = await ensureConversation(supabase, {
        userId: widget.user_id,
        recipientId: visitorId,
        username: displayName,
        platform: "webchat",
        workspaceId: widget.workspace_id,
        channelAccountId: widget.public_key,
      })
      if (conversation?.id) {
        await insertMessage(supabase, {
          id: messageId,
          conversation_id: conversation.id,
          user_id: widget.user_id,
          sender_id: visitorId,
          sender_username: displayName,
          content: text,
          direction: "in",
          platform: "webchat",
        })
      }
      const { acceptInboundWebhook } = await import("@/lib/inbound-queue")
      const body = {
        widget_id: widget.public_key,
        visitor_id: visitorId,
        text,
        message_id: messageId,
        display_name: displayName,
      }
      const queued = await acceptInboundWebhook(supabase, "webchat", body)
      if (queued.fallback) {
        const { processWebchatEvent } = await import("@/lib/channels/ingress")
        await processWebchatEvent(body, supabase)
      }
    },
    async greet(widget, visitorId, text) {
      const conversation = await ensureConversation(supabase, {
        userId: widget.user_id,
        recipientId: visitorId,
        username: "Website visitor",
        platform: "webchat",
        workspaceId: widget.workspace_id,
        channelAccountId: widget.public_key,
      })
      if (!conversation?.id) return
      await insertMessage(supabase, {
        id: `wc_greet_${visitorId}`,
        conversation_id: conversation.id,
        user_id: widget.user_id,
        sender_id: widget.public_key,
        sender_username: widget.name || "Chat",
        content: text,
        direction: "out",
        platform: "webchat",
      })
    },
  }
}
