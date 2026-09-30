import type { NormalizedInbound } from "@/lib/channels/types"

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function text(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

export function parseTikTokContent(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return record(JSON.parse(value))
    } catch {
      return null
    }
  }
  return record(value)
}

function messageText(content: Record<string, unknown>): string {
  const type = text(content.type).toLowerCase()
  if (type === "text" || content.text) {
    const body = text(record(content.text)?.body)
    if (body) return body
  }
  if (type === "image") return "[image]"
  if (type === "video") return "[video]"
  if (type === "sticker") return "[sticker]"
  if (type === "emoji") return "[emoji]"
  if (type === "share_post") return "[tiktok post]"
  if (type === "template") {
    const template = record(content.template)
    const title = text(record(Array.isArray(template?.elements) ? template.elements[0] : null)?.title)
    return title ? `[template] ${title}` : "[template]"
  }
  const referral = record(content.referral)
  const prefilled = text(record(referral?.short_link)?.prefilled_message)
  if (prefilled) return prefilled
  if (referral) return `[referral:${text(referral.source) || "tiktok"}]`
  return ""
}

/**
 * Turn one Business Messaging webhook into pipeline events.
 * Echoes (`im_send_msg`, business-account sender) and read receipts are dropped.
 * `im_receive_msg` and `im_receive_msg_eu` are keyword-DM input.
 * `im_receive_high_intent_comment` is the only comment event the API emits,
 * and only after Comment-to-Message is enabled.
 */
export function normalizeTikTokWebhook(body: unknown): NormalizedInbound[] {
  const root = record(body)
  if (!root) return []
  const eventName = text(root.event)
  const openId = text(root.user_openid)
  const content = parseTikTokContent(root.content)
  if (!eventName || !content) return []

  if (eventName === "im_send_msg" || eventName === "im_mark_read_msg" || eventName === "im_auto_message_config_update" || eventName === "im_auto_message_audit_update") {
    return []
  }

  const fromUser = record(content.from_user)
  const role = text(fromUser?.role).toLowerCase()
  if (role === "business_account") return []

  const contactExternalId = text(content.unique_identifier) || text(fromUser?.id)
  if (!contactExternalId || !openId) return []
  const username = text(content.from) || undefined
  const occurredAtMs = typeof content.timestamp === "number" ? content.timestamp : Number(content.timestamp) || undefined

  if (eventName === "im_receive_high_intent_comment") {
    const commentText = text(content.comment_text)
    const commentId = text(content.comment_id)
    if (!commentText || !commentId) return []
    return [
      {
        channel: "tiktok",
        kind: "comment",
        contactExternalId,
        text: commentText,
        commentId,
        username,
        displayName: username,
        occurredAtMs: Number.isFinite(occurredAtMs) ? occurredAtMs : undefined,
        accountRef: openId,
      },
    ]
  }

  if (eventName !== "im_receive_msg" && eventName !== "im_receive_msg_eu" && eventName !== "im_referral_msg") {
    return []
  }

  const bodyText = messageText(content)
  if (!bodyText) return []
  const type = text(content.type).toLowerCase()
  const templateButton = type === "template"
  return [
    {
      channel: "tiktok",
      kind: templateButton ? "dm" : "dm",
      contactExternalId,
      text: bodyText,
      messageId: text(content.message_id) || undefined,
      username,
      displayName: username,
      chatId: text(content.conversation_id) || undefined,
      occurredAtMs: Number.isFinite(occurredAtMs) ? occurredAtMs : undefined,
      accountRef: openId,
    },
  ]
}
