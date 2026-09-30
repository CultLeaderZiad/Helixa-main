import { FACEBOOK_GRAPH_BASE, INSTAGRAM_GRAPH_BASE } from "@/lib/graph"
import type {
  ChannelAdapter,
  FetchLike,
  OutboundButton,
  OutboundCard,
  OutboundMedia,
  QuickReply,
  SendContext,
  SendOutcome,
} from "@/lib/channels/types"
import { defaultFetch, graphOutcome, postJson } from "@/lib/channels/http"

const STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000

function quickReplies(replies: QuickReply[] | undefined, limit: number) {
  return (replies || [])
    .filter((reply) => reply?.title)
    .slice(0, limit)
    .map((reply) => ({
      content_type: "text",
      title: reply.title.slice(0, 20),
      payload: reply.payload || `QR_${reply.title.toUpperCase().replace(/\s+/g, "_")}`,
    }))
}

function cardElements(card: OutboundCard) {
  const buttons = (card.buttons || [])
    .filter((button) => button.title)
    .map((button) => ({
      type: button.type,
      title: button.title,
      url: button.type === "web_url" ? button.url : undefined,
      payload: button.type === "postback" ? button.payload : undefined,
    }))
  const element: Record<string, unknown> = { title: card.title, buttons }
  if (card.subtitle) element.subtitle = card.subtitle
  if (card.image_url?.startsWith("http")) element.image_url = card.image_url
  return element
}

function metaBody(
  channel: "instagram" | "messenger" | "facebook",
  ctx: SendContext,
  message: unknown,
) {
  const recipient = ctx.commentId ? { comment_id: ctx.commentId } : { id: ctx.recipientId }
  const body: Record<string, unknown> = { recipient, message }
  // Instagram Login rejects a bare messaging_type on ordinary replies. The
  // Human Agent tag is the only extra field that path needs. Messenger's Send
  // API requires messaging_type on every call.
  if (channel === "instagram") {
    if (ctx.tag) {
      body.tag = ctx.tag
      body.messaging_type = "MESSAGE_TAG"
    }
    return body
  }
  body.messaging_type = ctx.tag ? "MESSAGE_TAG" : ctx.messagingType || "RESPONSE"
  if (ctx.tag) body.tag = ctx.tag
  return body
}

function createMetaAdapter(input: {
  channel: "instagram" | "messenger" | "facebook"
  graphBase: string
  supportsHumanAgent: boolean
  fetchImpl: FetchLike
  commentReplyPath: "replies" | "comments"
}): ChannelAdapter {
  const send = async (ctx: SendContext, message: unknown): Promise<SendOutcome> => {
    const url = `${input.graphBase}/me/messages?access_token=${encodeURIComponent(ctx.accessToken)}`
    const result = await postJson(input.fetchImpl, url, metaBody(input.channel, ctx, message))
    return graphOutcome(result.json)
  }

  return {
    channel: input.channel,
    messagingWindowMs: STANDARD_WINDOW_MS,
    supportsHumanAgent: input.supportsHumanAgent,
    async sendText(ctx, text, replies) {
      const message: Record<string, unknown> = { text }
      const packed = quickReplies(replies, 13)
      if (packed.length) message.quick_replies = packed
      return send(ctx, message)
    },
    async sendCard(ctx, card) {
      return send(ctx, {
        attachment: { type: "template", payload: { template_type: "generic", elements: [cardElements(card)] } },
      })
    },
    async sendMedia(ctx, media) {
      return send(ctx, { attachment: { type: media.type || "image", payload: { url: media.url } } })
    },
    async privateReply(ctx, text, replies) {
      return this.sendText({ ...ctx, recipientId: undefined }, text, replies)
    },
    async publicReply(ctx, commentId, message) {
      const url = `${input.graphBase}/${commentId}/${input.commentReplyPath}?access_token=${encodeURIComponent(ctx.accessToken)}`
      const result = await postJson(input.fetchImpl, url, { message })
      return graphOutcome(result.json)
    },
    async profile(ctx, externalId) {
      const fields = input.channel === "instagram" ? "username,name" : "name"
      const url = `${input.graphBase}/${externalId}?fields=${fields}&access_token=${encodeURIComponent(ctx.accessToken)}`
      const response = await input.fetchImpl(url)
      const json = await response.json().catch(() => null)
      if (!json || json.error) return null
      return { username: json.username, name: json.name }
    },
    async typing(ctx, on) {
      if (!ctx.recipientId) return
      await postJson(
        input.fetchImpl,
        `${input.graphBase}/me/messages?access_token=${encodeURIComponent(ctx.accessToken)}`,
        { recipient: { id: ctx.recipientId }, sender_action: on ? "typing_on" : "typing_off" },
      )
    },
    async markSeen(ctx) {
      if (!ctx.recipientId) return
      await postJson(
        input.fetchImpl,
        `${input.graphBase}/me/messages?access_token=${encodeURIComponent(ctx.accessToken)}`,
        { recipient: { id: ctx.recipientId }, sender_action: "mark_seen" },
      )
    },
  }
}

function whatsappMediaKey(type: OutboundMedia["type"]): "image" | "video" | "audio" {
  if (type === "video" || type === "audio") return type
  return "image"
}

export function createWhatsAppAdapter(fetchImpl: FetchLike = defaultFetch()): ChannelAdapter {
  const send = async (ctx: SendContext, body: Record<string, unknown>): Promise<SendOutcome> => {
    if (!ctx.senderRef) return { ok: false, error: "missing_phone_number_id" }
    const url = `${FACEBOOK_GRAPH_BASE}/${ctx.senderRef}/messages`
    const result = await postJson(fetchImpl, url, body, { Authorization: `Bearer ${ctx.accessToken}` })
    if (result.json?.error) return graphOutcome(result.json)
    return { ok: true, id: result.json?.messages?.[0]?.id }
  }

  return {
    channel: "whatsapp",
    messagingWindowMs: STANDARD_WINDOW_MS,
    supportsHumanAgent: false,
    async sendText(ctx, text, replies) {
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: ctx.recipientId,
      }
      const buttons = (replies || []).filter((reply) => reply.title).slice(0, 3)
      if (buttons.length) {
        body.type = "interactive"
        body.interactive = {
          type: "button",
          body: { text },
          action: {
            buttons: buttons.map((reply) => ({
              type: "reply",
              reply: { id: reply.payload || reply.title, title: reply.title.slice(0, 20) },
            })),
          },
        }
      } else {
        body.type = "text"
        body.text = { body: text, preview_url: true }
      }
      return send(ctx, body)
    },
    async sendCard(ctx, card) {
      const links = (card.buttons || [])
        .filter((button) => button.type === "web_url" && button.url)
        .map((button) => `${button.title}: ${button.url}`)
        .join("\n")
      const replies = (card.buttons || [])
        .filter((button) => button.type === "postback")
        .map((button) => ({ title: button.title, payload: button.payload || button.title }))
      const text = [card.title, card.subtitle, links].filter(Boolean).join("\n\n")
      return this.sendText(ctx, text, replies)
    },
    async sendMedia(ctx, media, caption) {
      const key = whatsappMediaKey(media.type)
      return send(ctx, {
        messaging_product: "whatsapp",
        to: ctx.recipientId,
        type: key,
        [key]: { link: media.url, caption },
      })
    },
    async markSeen(ctx, messageId) {
      if (!messageId || !ctx.senderRef) return
      await send(ctx, { messaging_product: "whatsapp", status: "read", message_id: messageId })
    },
  }
}

function telegramKeyboard(buttons: Array<OutboundButton | QuickReply> | undefined) {
  if (!buttons?.length) return undefined
  const rows = buttons.map((button) => {
    const title = button.title
    if ("type" in button && button.type === "web_url" && button.url) return [{ text: title, url: button.url }]
    const payload = ("payload" in button && button.payload) || ("url" in button && button.url) || title
    return [{ text: title, callback_data: payload }]
  })
  return { inline_keyboard: rows }
}

export function createTelegramAdapter(fetchImpl: FetchLike = defaultFetch()): ChannelAdapter {
  const call = async (token: string, method: string, body: Record<string, unknown>): Promise<SendOutcome> => {
    const result = await postJson(fetchImpl, `https://api.telegram.org/bot${token}/${method}`, body)
    if (result.json?.ok) return { ok: true, id: result.json.result?.message_id ? String(result.json.result.message_id) : undefined }
    return { ok: false, error: result.json?.description || "Telegram send failed" }
  }

  return {
    channel: "telegram",
    messagingWindowMs: null,
    supportsHumanAgent: false,
    async sendText(ctx, text, replies) {
      if (!ctx.recipientId) return { ok: false, error: "missing_chat" }
      return call(ctx.accessToken, "sendMessage", {
        chat_id: ctx.recipientId,
        text,
        reply_markup: telegramKeyboard(replies),
      })
    },
    async sendCard(ctx, card) {
      if (!ctx.recipientId) return { ok: false, error: "missing_chat" }
      const caption = `*${card.title}*${card.subtitle ? `\n\n${card.subtitle}` : ""}`
      const keyboard = telegramKeyboard(card.buttons)
      if (card.image_url?.startsWith("http")) {
        return call(ctx.accessToken, "sendPhoto", {
          chat_id: ctx.recipientId,
          photo: card.image_url,
          caption,
          parse_mode: "Markdown",
          reply_markup: keyboard,
        })
      }
      return call(ctx.accessToken, "sendMessage", {
        chat_id: ctx.recipientId,
        text: caption,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    },
    async sendMedia(ctx, media, caption) {
      if (!ctx.recipientId) return { ok: false, error: "missing_chat" }
      return call(ctx.accessToken, "sendPhoto", {
        chat_id: ctx.recipientId,
        photo: media.url,
        caption,
      })
    },
    async typing(ctx) {
      if (!ctx.recipientId) return
      await call(ctx.accessToken, "sendChatAction", { chat_id: ctx.recipientId, action: "typing" })
    },
    async markSeen() {
      return undefined
    },
  }
}

export function createInstagramAdapter(fetchImpl?: FetchLike): ChannelAdapter {
  return createMetaAdapter({
    channel: "instagram",
    graphBase: INSTAGRAM_GRAPH_BASE,
    supportsHumanAgent: true,
    fetchImpl: fetchImpl || defaultFetch(),
    commentReplyPath: "replies",
  })
}

export function createMessengerAdapter(fetchImpl?: FetchLike): ChannelAdapter {
  return createMetaAdapter({
    channel: "messenger",
    graphBase: FACEBOOK_GRAPH_BASE,
    supportsHumanAgent: true,
    fetchImpl: fetchImpl || defaultFetch(),
    commentReplyPath: "comments",
  })
}

const instagram = createInstagramAdapter()
const messenger = createMessengerAdapter()
const whatsapp = createWhatsAppAdapter()
const telegram = createTelegramAdapter()

/**
 * Register a channel here. TikTok would be `tiktok: createTikTokAdapter()`
 * once that adapter exists. Nothing else in the pipeline needs to change.
 */
export const channelAdapters = {
  instagram,
  messenger,
  facebook: messenger,
  whatsapp,
  telegram,
} as const

export function getAdapter(channel: string): ChannelAdapter | null {
  if (channel in channelAdapters) return channelAdapters[channel as keyof typeof channelAdapters]
  return null
}
