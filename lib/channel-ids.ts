/** Global messages.id for a Telegram update. message_id is only unique per chat. */
export function telegramMessageId(
  chatId: string | number,
  messageId: string | number | null | undefined,
): string {
  if (messageId === null || messageId === undefined || messageId === "") {
    return `tg_${chatId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
  return `tg_${chatId}_${messageId}`
}

/**
 * AI replies are not automations. `automation_events.automation_id` is a UUID
 * foreign key, so the old "AI_AUTO_REPLY" string was rejected and never showed
 * up in analytics. `event_type = ai_reply` with a null automation id does.
 */
export function aiReplyEvent(input: {
  userId: string | number
  platform: string
  recipientId?: string | null
}) {
  return {
    user_id: input.userId,
    automation_id: null as null,
    event_type: "ai_reply",
    recipient_id: input.recipientId ?? null,
    platform: input.platform,
  }
}

/** Prefer the messenger row when connect stored both facebook and messenger. */
export function pickPageConnection<T extends { platform?: string | null }>(rows: T[] | null | undefined): T | null {
  if (!rows || rows.length === 0) return null
  return rows.find((row) => row.platform === "messenger") || rows[0]
}

export function storyEventKey(event: {
  sender?: { id?: string | number }
  message?: {
    mid?: string
    reply_to?: { story?: { id?: string } }
    attachments?: Array<{ type?: string }>
  }
}): string | null {
  const senderId = event.sender?.id
  if (senderId == null) return null
  if (event.message?.reply_to?.story) {
    return `story:${senderId}:${event.message.mid || event.message.reply_to.story.id || ""}`
  }
  if (event.message?.attachments?.[0]?.type === "story_mention") {
    return `mention:${senderId}:${event.message.mid || ""}`
  }
  return null
}
