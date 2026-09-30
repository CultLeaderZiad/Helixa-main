import { INSTAGRAM_GRAPH_BASE } from "@/lib/graph"
import { isMetaAuthError } from "@/lib/instagram-token"

const GRAPH = INSTAGRAM_GRAPH_BASE

type AuthFailureHandler = (error: unknown) => void
const authFailureHandlers = new Map<string, Set<AuthFailureHandler>>()

/**
 * Register a callback for Graph error 190 on this token. The webhook uses it
 * so a rejected token marks the account as needing a reconnect without
 * threading that check through every send helper.
 */
export function watchInstagramAuthFailures(token: string, handler: AuthFailureHandler): () => void {
  if (!token) return () => {}
  let handlers = authFailureHandlers.get(token)
  if (!handlers) {
    handlers = new Set()
    authFailureHandlers.set(token, handlers)
  }
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
    if (handlers.size === 0) authFailureHandlers.delete(token)
  }
}

function notifyAuthFailure(token: string, error: unknown) {
  if (!isMetaAuthError(error)) return
  const handlers = authFailureHandlers.get(token)
  if (!handlers) return
  for (const handler of handlers) {
    try {
      handler(error)
    } catch {
      // A watcher must not break the send that reported the failure.
    }
  }
}

export interface IGButton {
  type: "web_url" | "postback"
  title: string
  url?: string
  payload?: string
}

export interface IGCard {
  title: string
  subtitle?: string
  image_url?: string
  buttons: IGButton[]
}

export interface QuickReply {
  title: string
  payload: string
}

export interface SendResult {
  ok: boolean
  id?: string
  error?: any
}

async function post(path: string, token: string, body: any): Promise<SendResult> {
  try {
    const res = await fetch(`${GRAPH}/${path}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) {
      console.error(`[ig-api] ${path} failed:`, JSON.stringify(json.error))
      notifyAuthFailure(token, json.error)
      return { ok: false, error: json.error }
    }
    return { ok: true, id: json.id || json.message_id }
  } catch (e) {
    console.error(`[ig-api] ${path} network error:`, e)
    return { ok: false, error: e }
  }
}

export function buildCardAttachment(card: IGCard) {
  const buttons = (card.buttons || [])
    .filter((b) => b.title)
    .map((b) => ({
      type: b.type,
      title: b.title,
      url: b.type === "web_url" ? b.url : undefined,
      payload: b.type === "postback" ? b.payload : undefined,
    }))

  // Always use the Generic Template for Instagram as Button Template is not fully supported
  // without dropping buttons in some client versions.

  // Otherwise, use the Generic Template (renders as bold title + blue links if no image)
  const element: any = { title: card.title, buttons }
  if (card.subtitle) element.subtitle = card.subtitle
  if (card.image_url?.startsWith("http")) element.image_url = card.image_url
  return {
    attachment: {
      type: "template",
      payload: { template_type: "generic", elements: [element] },
    },
  }
}

export async function sendTextDM(
  token: string,
  recipient: { id?: string; comment_id?: string },
  text: string,
  quickReplies?: QuickReply[],
): Promise<SendResult> {
  const message: any = { text }
  if (quickReplies?.length) {
    message.quick_replies = quickReplies.slice(0, 13).map((q) => ({
      content_type: "text",
      title: q.title.slice(0, 20),
      payload: q.payload,
    }))
  }
  return post("me/messages", token, { recipient, message })
}

export async function sendCardDM(
  token: string,
  recipient: { id?: string; comment_id?: string },
  card: IGCard,
): Promise<SendResult> {
  return post("me/messages", token, { recipient, message: buildCardAttachment(card) })
}

export async function sendMediaDM(
  token: string,
  recipient: { id?: string; comment_id?: string },
  mediaType: "image" | "video" | "audio",
  url: string,
): Promise<SendResult> {
  return post("me/messages", token, {
    recipient,
    message: { attachment: { type: mediaType, payload: { url } } },
  })
}

export async function sendSenderAction(
  token: string,
  recipientId: string,
  action: "typing_on" | "typing_off" | "mark_seen",
): Promise<SendResult> {
  return post("me/messages", token, { recipient: { id: recipientId }, sender_action: action })
}

export async function sendMessageReaction(
  token: string,
  recipientId: string,
  messageId: string,
  reaction = "love",
): Promise<SendResult> {
  return post("me/messages", token, {
    recipient: { id: recipientId },
    sender_action: "react",
    payload: { message_id: messageId, reaction },
  })
}

export async function replyToComment(token: string, commentId: string, message: string): Promise<SendResult> {
  return post(`${commentId}/replies`, token, { message })
}

export async function fetchProfile(token: string, igUserId: string): Promise<{ username?: string; name?: string } | null> {
  try {
    const res = await fetch(`${GRAPH}/${igUserId}?fields=username,name&access_token=${encodeURIComponent(token)}`)
    const json = await res.json()
    if (json.error) {
      console.warn("[ig-api] fetchProfile failed:", json.error?.message || JSON.stringify(json.error))
      notifyAuthFailure(token, json.error)
      return null
    }
    return json
  } catch {
    return null
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, Math.min(ms, 8000)))
}
