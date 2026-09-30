import type { Channel, NormalizedInbound } from "@/lib/channels/types"

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function entryTimeMs(entry: Record<string, unknown>): number | undefined {
  const time = entry.time
  if (typeof time === "number" && Number.isFinite(time)) return time * 1000
  return undefined
}

function isSystemMessaging(event: Record<string, unknown>): boolean {
  const message = record(event.message)
  return Boolean(event.read || event.delivery || message?.is_echo)
}

function messagingEvents(entry: Record<string, unknown>, channel: Channel, occurredAtMs?: number): NormalizedInbound[] {
  const events: NormalizedInbound[] = []
  for (const raw of list(entry.messaging)) {
    const event = record(raw)
    if (!event || isSystemMessaging(event)) continue
    const sender = record(event.sender)
    const contactExternalId = text(sender?.id)
    if (!contactExternalId) continue
    const message = record(event.message)
    const postback = record(event.postback)
    const reaction = record(event.reaction)
    const quickReply = record(message?.quick_reply)
    const replyTo = record(message?.reply_to)
    const story = record(replyTo?.story)
    const attachments = list(message?.attachments)
    const firstAttachment = record(attachments[0])
    const groupId = text(message?.mid) || text(postback?.mid) || undefined

    if (firstAttachment?.type === "story_mention") {
      const payload = record(firstAttachment.payload)
      events.push({
        channel,
        kind: "story_mention",
        contactExternalId,
        text: text(message?.text),
        messageId: text(message?.mid) || undefined,
        mediaId: text(payload?.url) || null,
        occurredAtMs,
        groupId,
      })
    } else if (reaction) {
      events.push({
        channel,
        kind: "story_reaction",
        contactExternalId,
        text: text(reaction.emoji),
        reaction: text(reaction.emoji),
        messageId: text(reaction.mid) || undefined,
        mediaId: text(reaction.mid) || null,
        occurredAtMs,
      })
    } else if (story) {
      events.push({
        channel,
        kind: "story_reply",
        contactExternalId,
        text: text(message?.text),
        messageId: text(message?.mid) || undefined,
        mediaId: text(story.id) || null,
        occurredAtMs,
        groupId,
      })
    }

    if (reaction) continue

    const payload = text(quickReply?.payload) || text(postback?.payload)
    const body = text(message?.text)
    const referral = text(record(event.referral)?.ref) || undefined
    if (payload) {
      events.push({
        channel,
        kind: "postback",
        contactExternalId,
        text: payload,
        messageId: text(message?.mid) || text(postback?.mid) || undefined,
        occurredAtMs,
        groupId,
        referral,
      })
    } else if (body || referral) {
      const textBody = body || referral || ""
      events.push({
        channel,
        kind: "dm",
        contactExternalId,
        text: channel === "instagram" ? textBody.toLowerCase().trim() : textBody.trim(),
        messageId: text(message?.mid) || undefined,
        occurredAtMs,
        groupId,
        referral,
      })
    }
  }
  return events
}

export function normalizeInstagramBody(body: unknown): NormalizedInbound[] {
  const root = record(body)
  if (!root || root.object === "page") return []
  const events: NormalizedInbound[] = []
  for (const rawEntry of list(root.entry)) {
    const entry = record(rawEntry)
    if (!entry) continue
    const occurredAtMs = entryTimeMs(entry)
    const accountRef = text(entry.id) || undefined
    for (const rawChange of list(entry.changes)) {
      const change = record(rawChange)
      const value = record(change?.value)
      if (!change || change.field !== "comments" || !value || !text(value.text)) continue
      const from = record(value.from)
      const media = record(value.media)
      const contactExternalId = text(from?.id)
      if (!contactExternalId) continue
      events.push({
        channel: "instagram",
        kind: "comment",
        contactExternalId,
        text: text(value.text).toLowerCase().trim(),
        commentId: text(value.id) || undefined,
        mediaId: text(media?.id) || null,
        parentId: text(value.parent_id) || null,
        occurredAtMs,
        accountRef,
      })
    }
    events.push(
      ...messagingEvents(entry, "instagram", occurredAtMs).map((event) => ({ ...event, accountRef })),
    )
  }
  return events
}

export function normalizeFacebookBody(body: unknown): NormalizedInbound[] {
  const root = record(body)
  if (!root) return []
  const events: NormalizedInbound[] = []
  for (const rawEntry of list(root.entry)) {
    const entry = record(rawEntry)
    if (!entry) continue
    const occurredAtMs = entryTimeMs(entry)
    const accountRef = text(entry.id) || undefined
    for (const rawChange of list(entry.changes)) {
      const change = record(rawChange)
      const value = record(change?.value)
      if (!change || !value) continue
      const isFeedComment = change.field === "feed" && value.item === "comment" && value.verb === "add"
      const isCommentField = change.field === "comments" && Boolean(text(value.text) || text(value.message))
      if (!isFeedComment && !isCommentField) continue
      const from = record(value.from)
      const media = record(value.media)
      const contactExternalId = text(from?.id)
      if (!contactExternalId) continue
      const commentText = text(value.message) || text(value.text)
      if (!commentText) continue
      events.push({
        channel: "messenger",
        kind: "comment",
        contactExternalId,
        text: commentText.toLowerCase().trim(),
        commentId: text(value.comment_id) || text(value.id) || undefined,
        mediaId: text(value.post_id) || text(media?.id) || null,
        parentId: text(value.parent_id) || null,
        displayName: text(from?.name) || undefined,
        occurredAtMs,
        accountRef,
      })
    }
    events.push(
      ...messagingEvents(entry, "messenger", occurredAtMs).map((event) => ({ ...event, accountRef })),
    )
  }
  return events
}

export function normalizeWhatsAppBody(body: unknown): NormalizedInbound[] {
  const root = record(body)
  if (!root || root.object !== "whatsapp_business_account") return []
  const events: NormalizedInbound[] = []
  for (const rawEntry of list(root.entry)) {
    const entry = record(rawEntry)
    if (!entry) continue
    for (const rawChange of list(entry.changes)) {
      const change = record(rawChange)
      const value = record(change?.value)
      if (!change || change.field !== "messages" || !value) continue
      const metadata = record(value.metadata)
      const phoneNumberId = text(metadata?.phone_number_id)
      for (const rawMessage of list(value.messages)) {
        const message = record(rawMessage)
        if (!message) continue
        const from = text(message.from)
        if (!from) continue
        const interactive = record(message.interactive)
        const buttonReply = record(interactive?.button_reply)
        const listReply = record(interactive?.list_reply)
        const textBody = record(message.text)
        const templateButton = record(message.button)
        let kind: "dm" | "postback" = "dm"
        let bodyText = ""
        if (message.type === "interactive" && (buttonReply || listReply)) {
          kind = "postback"
          bodyText = text(buttonReply?.id) || text(listReply?.id)
        } else if (message.type === "button" && (templateButton?.payload || templateButton?.text)) {
          kind = "postback"
          bodyText = text(templateButton?.payload) || text(templateButton?.text)
        } else if (message.type === "text") {
          bodyText = text(textBody?.body)
        } else if (message.type === "image" || message.type === "video" || message.type === "audio" || message.type === "document" || message.type === "sticker") {
          const media = record(message[String(message.type)])
          const caption = text(media?.caption)
          bodyText = caption ? `[${message.type}] ${caption}` : `[${message.type}]`
        }
        if (!bodyText) continue
        const contacts = list(value.contacts)
        const profile = record(record(contacts[0])?.profile)
        const timestamp = text(message.timestamp)
        const occurredAtMs = timestamp ? Number(timestamp) * 1000 : undefined
        events.push({
          channel: "whatsapp",
          kind,
          contactExternalId: from,
          text: bodyText,
          messageId: text(message.id) || undefined,
          displayName: text(profile?.name) || undefined,
          occurredAtMs: Number.isFinite(occurredAtMs) ? occurredAtMs : undefined,
          accountRef: phoneNumberId || undefined,
        })
      }
    }
  }
  return events
}

export function normalizeTelegramUpdate(update: unknown): NormalizedInbound[] {
  const root = record(update)
  if (!root) return []
  const callback = record(root.callback_query)
  if (callback) {
    const from = record(callback.from)
    const message = record(callback.message)
    const chat = record(message?.chat)
    const contactExternalId = text(from?.id)
    const payload = text(callback.data)
    if (!contactExternalId || !payload) return []
    return [
      {
        channel: "telegram",
        kind: "postback",
        contactExternalId,
        text: payload,
        username: text(from?.username) || text(from?.first_name) || undefined,
        displayName: text(from?.first_name) || undefined,
        chatId: text(chat?.id) || contactExternalId,
        messageId: text(message?.message_id) || undefined,
      },
    ]
  }
  const message = record(root.message)
  if (!message) return []
  const from = record(message.from)
  const chat = record(message.chat)
  const contactExternalId = text(from?.id)
  const body = text(message.text) || text(message.caption)
  if (!contactExternalId || !body) return []
  return [
    {
      channel: "telegram",
      kind: "dm",
      contactExternalId,
      text: body,
      username: text(from?.username) || text(from?.first_name) || undefined,
      displayName: text(from?.first_name) || undefined,
      chatId: text(chat?.id) || contactExternalId,
      messageId: text(message.message_id) || undefined,
    },
  ]
}
