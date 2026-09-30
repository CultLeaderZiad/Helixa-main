import type { RateBucket } from "@/lib/event-pipeline"
import {
  consumeWebchatRate,
  newVisitorCredentials,
  originAllowed,
  visitorSecretMatches,
  WEBCHAT_RATE_LIMIT,
  WEBCHAT_RATE_WINDOW_MS,
} from "@/lib/webchat/security"

export interface WebchatWidget {
  id: string
  user_id: string | number
  workspace_id: string | null
  public_key: string
  name: string
  greeting: string | null
  color: string
  locale: string
  allowed_domains: string[]
  enabled: boolean
}

export interface WebchatMessage {
  id: string
  content: string
  direction: "in" | "out"
  created_at: string
}

/**
 * Storage the public widget handlers need.
 * `messages` must return only the named visitor. The handler never asks for a widget's full inbox.
 */
export interface WebchatGateway {
  widgetByKey(publicKey: string): Promise<WebchatWidget | null>
  visitor(widgetId: string, visitorId: string): Promise<{ secret_hash: string } | null>
  createVisitor(input: { widgetId: string; visitorId: string; secretHash: string }): Promise<void>
  rate(key: string): Promise<RateBucket | null>
  saveRate(key: string, bucket: RateBucket): Promise<void>
  messages(widget: WebchatWidget, visitorId: string): Promise<WebchatMessage[]>
  acceptInbound(widget: WebchatWidget, visitorId: string, text: string, messageId: string, displayName: string): Promise<void>
  greet(widget: WebchatWidget, visitorId: string, text: string): Promise<void>
}

export interface WebchatHttp {
  status: number
  body: Record<string, unknown>
  /** When false, the response must not echo Access-Control-Allow-Origin. */
  cors: boolean
}

export interface WebchatCaller {
  origin: string | null
  ip: string
  now?: number
  sendLimit?: number
  pollLimit?: number
}

function fail(status: number, error: string, cors: boolean): WebchatHttp {
  return { status, body: { error }, cors }
}

async function loadWidget(
  gateway: WebchatGateway,
  publicKey: string,
  origin: string | null,
): Promise<{ widget: WebchatWidget } | WebchatHttp> {
  if (!publicKey) return fail(404, "unknown_widget", false)
  const widget = await gateway.widgetByKey(publicKey)
  if (!widget || !widget.enabled) return fail(404, "unknown_widget", false)
  if (!originAllowed(origin, widget.allowed_domains)) return fail(403, "origin_not_allowed", false)
  return { widget }
}

async function charge(
  gateway: WebchatGateway,
  key: string,
  now: number,
  limit: number,
): Promise<WebchatHttp | null> {
  const current = await gateway.rate(key)
  const next = consumeWebchatRate(current, now, limit, WEBCHAT_RATE_WINDOW_MS)
  await gateway.saveRate(key, next.bucket)
  if (!next.allowed) return fail(429, "rate_limited", true)
  return null
}

function branding(widget: WebchatWidget) {
  return {
    name: widget.name,
    greeting: widget.greeting,
    color: widget.color,
    locale: widget.locale,
    publicKey: widget.public_key,
  }
}

export async function openWebchatSession(
  gateway: WebchatGateway,
  caller: WebchatCaller,
  input: { publicKey: string; visitorId?: string; secret?: string; displayName?: string },
): Promise<WebchatHttp> {
  const loaded = await loadWidget(gateway, input.publicKey, caller.origin)
  if ("status" in loaded) return loaded
  const widget = loaded.widget
  const now = caller.now ?? Date.now()
  const limited = await charge(gateway, `webchat:ip:${widget.id}:${caller.ip || "unknown"}`, now, caller.sendLimit ?? WEBCHAT_RATE_LIMIT)
  if (limited) return limited

  if (input.visitorId) {
    const row = await gateway.visitor(widget.id, input.visitorId)
    if (!row || !input.secret || !visitorSecretMatches(input.secret, row.secret_hash)) {
      return fail(401, "visitor_secret", true)
    }
    return { status: 200, cors: true, body: { resumed: true, visitorId: input.visitorId, ...branding(widget) } }
  }

  const created = newVisitorCredentials()
  await gateway.createVisitor({ widgetId: widget.id, visitorId: created.visitorId, secretHash: created.secretHash })
  if (widget.greeting?.trim()) {
    await gateway.greet(widget, created.visitorId, widget.greeting.trim())
  }
  return {
    status: 200,
    cors: true,
    body: {
      resumed: false,
      visitorId: created.visitorId,
      secret: created.secret,
      ...branding(widget),
    },
  }
}

export async function postWebchatMessage(
  gateway: WebchatGateway,
  caller: WebchatCaller,
  input: { publicKey: string; visitorId?: string; secret?: string; text?: string; displayName?: string; messageId?: string },
): Promise<WebchatHttp> {
  const loaded = await loadWidget(gateway, input.publicKey, caller.origin)
  if ("status" in loaded) return loaded
  const widget = loaded.widget
  if (!input.visitorId || !input.secret) return fail(401, "visitor_secret", true)
  const row = await gateway.visitor(widget.id, input.visitorId)
  if (!row || !visitorSecretMatches(input.secret, row.secret_hash)) return fail(401, "visitor_secret", true)

  const now = caller.now ?? Date.now()
  const limited = await charge(
    gateway,
    `webchat:send:${widget.id}:${input.visitorId}`,
    now,
    caller.sendLimit ?? WEBCHAT_RATE_LIMIT,
  )
  if (limited) return limited

  const text = String(input.text || "").trim().slice(0, 2000)
  if (!text) return fail(400, "empty_message", true)
  const messageId = input.messageId || `wc_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  await gateway.acceptInbound(widget, input.visitorId, text, messageId, input.displayName || "Website visitor")
  return { status: 200, cors: true, body: { ok: true, messageId } }
}

export async function listWebchatMessages(
  gateway: WebchatGateway,
  caller: WebchatCaller,
  input: { publicKey: string; visitorId?: string; secret?: string },
): Promise<WebchatHttp> {
  const loaded = await loadWidget(gateway, input.publicKey, caller.origin)
  if ("status" in loaded) return loaded
  const widget = loaded.widget
  if (!input.visitorId || !input.secret) return fail(401, "visitor_secret", true)
  const row = await gateway.visitor(widget.id, input.visitorId)
  if (!row || !visitorSecretMatches(input.secret, row.secret_hash)) return fail(401, "visitor_secret", true)

  const now = caller.now ?? Date.now()
  const limited = await charge(
    gateway,
    `webchat:poll:${widget.id}:${input.visitorId}`,
    now,
    caller.pollLimit ?? 120,
  )
  if (limited) return limited

  const messages = await gateway.messages(widget, input.visitorId)
  return { status: 200, cors: true, body: { messages } }
}
