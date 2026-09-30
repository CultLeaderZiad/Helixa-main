import { RetryableInboundError } from "@/lib/event-pipeline"
import { responsePreviewText } from "@/lib/webhook-utils"
import type { ChannelAdapter, OutboundContent, SendContext, SendOutcome } from "@/lib/channels/types"

export function quickRepliesFrom(content: OutboundContent) {
  if (!Array.isArray(content.quick_replies)) return undefined
  const replies = content.quick_replies
    .filter((reply) => reply?.title)
    .map((reply) => ({
      title: reply.title,
      payload: reply.payload || `QR_${reply.title.toUpperCase().replace(/\s+/g, "_")}`,
    }))
  return replies.length ? replies : undefined
}

export function privateReplyText(content: OutboundContent): string {
  let text = content.message || content.reply_text || content.card?.title || "[Automated Reply]"
  const links = (content.card?.buttons || [])
    .filter((button) => button.type === "web_url" && button.url)
    .map((button) => `${button.title}:\n${button.url}`)
    .join("\n\n")
  if (links) text += `\n\n${links}`
  return text
}

/**
 * Sends one automation payload through the adapter.
 * Comment private replies cannot carry a template. Instagram turns the card
 * into a quick reply that opens the real card inside the DM window. Messenger
 * appends the links as text.
 */
export async function deliverContent(
  adapter: ChannelAdapter,
  ctx: SendContext,
  content: OutboundContent,
  options: {
    privateComment?: boolean
    privateReplyStyle?: "instagram_card" | "append_links" | "none"
    automationId?: string | null
    variantId?: string | null
  } = {},
): Promise<SendOutcome> {
  if (options.privateComment) {
    if (
      options.privateReplyStyle === "instagram_card" &&
      content.card?.buttons?.length &&
      options.automationId &&
      adapter.privateReply
    ) {
      const text = content.message || content.card.title || "I have a link for you!"
      const button = content.card.buttons[0]
      return finish(
        await adapter.privateReply(ctx, text, [
          {
            title: button?.title || "Show link",
            payload: `SYS_CARD_${options.automationId}_${options.variantId || "default"}`,
          },
        ]),
      )
    }
    const text = privateReplyText(content)
    if (adapter.privateReply) return finish(await adapter.privateReply(ctx, text))
    return finish(await adapter.sendText({ ...ctx, commentId: undefined }, text))
  }

  if (content.typing_indicator && ctx.recipientId && adapter.typing) {
    await adapter.typing(ctx, true)
  }

  let result: SendOutcome = { ok: false, error: "empty content" }
  const replies = quickRepliesFrom(content)
  if (content.list && adapter.sendList) {
    result = await adapter.sendList(ctx, content.list)
  } else if (content.media?.url) {
    result = await adapter.sendMedia(ctx, content.media, content.message)
    if (result.ok && content.message) {
      result = await adapter.sendText(ctx, content.message, replies)
    }
  } else if (content.cards?.length) {
    if (adapter.sendCarousel) {
      result = await adapter.sendCarousel(ctx, content.cards)
    } else {
      for (const card of content.cards) result = await adapter.sendCard(ctx, card)
    }
    if (result.ok && content.message) result = await adapter.sendText(ctx, content.message)
  } else if (content.card) {
    result = await adapter.sendCard(ctx, content.card)
  } else if (content.message || content.reply_text) {
    result = await adapter.sendText(ctx, content.message || content.reply_text || "", replies)
  }

  if (content.typing_indicator && ctx.recipientId && adapter.typing) {
    await adapter.typing(ctx, false)
  }
  return finish(result)
}

function finish(result: SendOutcome): SendOutcome {
  if (!result.ok && result.error !== "empty content" && !result.outsideWindow) {
    throw new RetryableInboundError(result.error || "send failed")
  }
  return result
}

export function previewOf(content: OutboundContent): string {
  return responsePreviewText(content)
}
