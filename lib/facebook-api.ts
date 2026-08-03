const GRAPH = "https://graph.facebook.com/v20.0"

export interface FBButton {
  type: "web_url" | "postback"
  title: string
  url?: string
  payload?: string
}

export interface FBCard {
  title: string
  subtitle?: string
  image_url?: string
  buttons: FBButton[]
}

export interface FBQuickReply {
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
      console.error(`[fb-api] ${path} failed:`, JSON.stringify(json.error))
      return { ok: false, error: json.error }
    }
    return { ok: true, id: json.id || json.message_id }
  } catch (e) {
    console.error(`[fb-api] ${path} network error:`, e)
    return { ok: false, error: e }
  }
}

export function buildCardAttachment(card: FBCard) {
  const buttons = (card.buttons || [])
    .filter((b) => b.title)
    .map((b) => ({
      type: b.type,
      title: b.title,
      url: b.type === "web_url" ? b.url : undefined,
      payload: b.type === "postback" ? b.payload : undefined,
    }))
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

export async function sendFacebookText(
  token: string,
  recipient: { id?: string; comment_id?: string },
  text: string,
  quickReplies?: FBQuickReply[],
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

export async function sendFacebookCard(
  token: string,
  recipient: { id?: string; comment_id?: string },
  card: FBCard,
): Promise<SendResult> {
  return post("me/messages", token, { recipient, message: buildCardAttachment(card) })
}

export async function sendFacebookMedia(
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

export async function sendFacebookSenderAction(
  token: string,
  recipientId: string,
  action: "typing_on" | "typing_off" | "mark_seen",
): Promise<SendResult> {
  return post("me/messages", token, { recipient: { id: recipientId }, sender_action: action })
}

export async function replyToFacebookComment(token: string, commentId: string, message: string): Promise<SendResult> {
  return post(`${commentId}/comments`, token, { message })
}

export async function fetchFacebookProfile(token: string, fbUserId: string): Promise<{ name?: string } | null> {
  try {
    const res = await fetch(`${GRAPH}/${fbUserId}?fields=name&access_token=${encodeURIComponent(token)}`)
    const json = await res.json()
    if (json.error) return null
    return json
  } catch {
    return null
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, Math.min(ms, 8000)))
}
